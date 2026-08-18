const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const { detectConflict, mergeEntity, resolveConflict } = require("../electron/conflictResolution.cjs");
const { runMigrations } = require("../electron/migrations.cjs");

function createMemoryDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  return {
    close: () => sqlite.close(),
    all: async (sql, params = []) => sqlite.prepare(sql).all(...params),
    get: async (sql, params = []) => sqlite.prepare(sql).get(...params),
    run: async (sql, params = []) => {
      const info = sqlite.prepare(sql).run(...params);
      return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
    },
    transaction: async (queries) => {
      const tx = sqlite.transaction((ops) => {
        for (const op of ops) {
          sqlite.prepare(op.sql).run(...(op.params || []));
        }
      });
      tx(queries);
      return { success: true };
    },
  };
}

test("detectConflict correctly identifies concurrent changes", () => {
  const base = { id: "p1", name: "Original", price: 100 };
  const local = { id: "p1", name: "Local Change", price: 100 };
  const remote = { id: "p1", name: "Original", price: 200 };
  const both = { id: "p1", name: "Local Change", price: 200 };

  // No conflict: only local changed
  assert.equal(detectConflict(local, base, base), false);
  
  // No conflict: only remote changed
  assert.equal(detectConflict(base, remote, base), false);
  
  // Conflict: both changed different fields
  assert.equal(detectConflict(local, remote, base), true);
  
  // Conflict: both changed same field
  assert.equal(detectConflict(both, both, base), true);
});

test("mergeEntity applies field-level last-write-wins", () => {
  const base = { id: "p1", name: "Original", price: 100, updated_at: 1000 };
  const local = { id: "p1", name: "Local Edit", price: 100, updated_at: 2000 };
  const remote = { id: "p1", name: "Original", price: 200, updated_at: 3000 };

  const merged = mergeEntity(local, remote, base, "products");
  
  assert.equal(merged.name, "Local Edit");
  assert.equal(merged.price, 200);
  assert.equal(merged.updated_at, 3000);
});

test("resolveConflict updates local DB and sync queue", async () => {
  const db = createMemoryDb();
  await runMigrations(db);

  const storeId = "store-1";
  const productId = "prod-1";
  
  // Setup initial state
  await db.run(
    "INSERT INTO products (id, store_id, name, price, version) VALUES (?, ?, ?, ?, ?)",
    [productId, storeId, "Old Name", 100, 1]
  );
  
  const baseVersion = { id: productId, name: "Old Name", price: 100, version: 1 };
  
  // Queue a sync item that has a conflict
  const payload = { id: productId, store_id: storeId, name: "Remote Name", price: 100, version: 2 };
  await db.run(
    `INSERT INTO sync_queue (id, store_id, action_type, entity_id, payload_json, conflict_status, base_version_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ["sync-1", storeId, "PRODUCT_UPSERT", productId, JSON.stringify(payload), "detected", JSON.stringify(baseVersion), "PENDING"]
  );

  // Update local product to create conflict
  await db.run("UPDATE products SET name = ?, version = ? WHERE id = ?", ["Local Name", 2, productId]);

  const item = await db.get("SELECT * FROM sync_queue WHERE id = ?", ["sync-1"]);
  const result = await resolveConflict(db, item, "auto");

  assert.equal(result.success, true);
  assert.equal(result.resolution, "field_level_merge");
  
  const updatedProduct = await db.get("SELECT * FROM products WHERE id = ?", [productId]);
  assert.equal(updatedProduct.name, "Remote Name"); // Remote wins if versions are equal in this simple logic or if remote is newer
  // Actually, mergeEntity for products uses fieldLevel which uses version comparison
  
  const updatedItem = await db.get("SELECT * FROM sync_queue WHERE id = ?", ["sync-1"]);
  assert.equal(updatedItem.conflict_status, "resolved");
  assert.equal(updatedItem.status, "PENDING");

  db.close();
});
