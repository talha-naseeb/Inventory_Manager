const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const { runMigrations } = require("../electron/migrations.cjs");
const { createOrder } = require("../electron/orderService.cjs");
const { recordReturn } = require("../electron/returnService.cjs");
const { finalizeExchange } = require("../electron/exchangeService.cjs");
const { prepareSyncOperation } = require("../electron/syncPayloads.cjs");
const { hashPin, verifyPin } = require("../electron/pinService.cjs");
const { getMaintenanceOperations } = require("../electron/databaseMaintenance.cjs");
const { assetUrlToPath, toAssetUrl, toFetchableFileUrl } = require("../electron/assetProtocol.cjs");
const { searchProducts } = require("../electron/productSearchService.cjs");

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

async function migratedDb() {
  const db = createMemoryDb();
  await runMigrations(db);
  return db;
}

test("fresh migrations create every runtime table", async () => {
  const db = await migratedDb();
  const rows = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  const tables = new Set(rows.map((row) => row.name));

  for (const table of [
    "brands",
    "products",
    "customers",
    "orders",
    "order_items",
    "inventory_logs",
    "sync_queue",
    "staff",
    "login_logs",
    "settings",
    "rolls",
    "returns",
  ]) {
    assert.equal(tables.has(table), true, `missing table: ${table}`);
  }

  db.close();
});

test("migrations add required columns to upgraded databases", async () => {
  const db = createMemoryDb();
  await db.run("CREATE TABLE staff (id TEXT PRIMARY KEY, name TEXT NOT NULL, pin TEXT NOT NULL, role TEXT DEFAULT 'cashier')");
  await db.run("INSERT INTO staff (id, name, pin, role) VALUES (?, ?, ?, ?)", ["owner-1", "Owner", "123456", "owner"]);
  await db.run("CREATE TABLE sync_queue (id TEXT PRIMARY KEY, action_type TEXT NOT NULL, entity_id TEXT NOT NULL, payload_json TEXT)");
  await db.run("CREATE TABLE rolls (id TEXT PRIMARY KEY, product_id TEXT NOT NULL)");
  await db.run("CREATE TABLE returns (id TEXT PRIMARY KEY, order_id TEXT NOT NULL)");

  await runMigrations(db);

  const columns = async (table) => new Set((await db.all(`PRAGMA table_info(${table})`)).map((column) => column.name));
  assert.equal((await columns("staff")).has("store_id"), true);
  assert.equal((await columns("staff")).has("status"), true);
  assert.equal((await columns("staff")).has("pin_hash"), true);
  assert.equal((await columns("sync_queue")).has("retry_count"), true);
  assert.equal((await columns("sync_queue")).has("last_error"), true);
  assert.equal((await columns("returns")).has("store_id"), true);
  assert.equal((await columns("rolls")).has("status"), true);

  const owner = await db.get("SELECT pin, pin_hash, store_id, status FROM staff WHERE id = ?", ["owner-1"]);
  assert.equal(owner.pin, "");
  assert.equal(owner.store_id, "default");
  assert.equal(owner.status, "active");
  assert.equal(verifyPin("123456", owner.pin_hash), true);

  db.close();
});

test("migrations add exchange metadata and customer credit support", async () => {
  const db = await migratedDb();

  const columns = async (table) => new Set((await db.all(`PRAGMA table_info(${table})`)).map((column) => column.name));
  const returnsColumns = await columns("returns");
  const customerColumns = await columns("customers");
  const tables = new Set((await db.all("SELECT name FROM sqlite_master WHERE type='table'")).map((row) => row.name));

  assert.equal(returnsColumns.has("replacement_order_id"), true);
  assert.equal(returnsColumns.has("balance_outcome"), true);
  assert.equal(returnsColumns.has("amount_due"), true);
  assert.equal(returnsColumns.has("remaining_balance"), true);
  assert.equal(customerColumns.has("store_credit_balance"), true);
  assert.equal(tables.has("customer_credit_logs"), true);

  db.close();
});

test("migrations seed business profile settings defaults", async () => {
  const db = await migratedDb();
  const rows = await db.all("SELECT key, value FROM settings WHERE key IN (?, ?)", ["business_type", "custom_stock_unit"]);
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  assert.equal(settings.business_type, "general");
  assert.equal(settings.custom_stock_unit, "");

  db.close();
});

test("migrations upgrade legacy settings table for business profile upserts", async () => {
  const db = createMemoryDb();
  await db.run("CREATE TABLE settings (key TEXT, value TEXT)");
  await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ["business_type", "textile"]);

  await runMigrations(db);

  const settingsColumns = new Set((await db.all("PRAGMA table_info(settings)")).map((column) => column.name));
  assert.equal(settingsColumns.has("updated_at"), true);

  await db.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    ["business_type", "grocery"],
  );

  const rows = await db.all("SELECT key, value FROM settings WHERE key IN (?, ?) ORDER BY key", ["business_type", "custom_stock_unit"]);
  assert.deepEqual(rows, [
    { key: "business_type", value: "grocery" },
    { key: "custom_stock_unit", value: "" },
  ]);

  db.close();
});

test("checkout creates an order and decrements product stock", async () => {
  const db = await migratedDb();
  await db.run(
    "INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["prod-1", "default", "Cotton Suit", "SKU-1", 100, 80, 5],
  );

  const result = await createOrder(db, {
    id: "order-1",
    store_id: "default",
    customer_name: "Cash Customer",
    subtotal: 200,
    total: 200,
    payment_method: "cash",
    items: [
      {
        productId: "prod-1",
        name: "Cotton Suit",
        price: 100,
        quantity: 2,
        total: 200,
        priceType: "retail",
      },
    ],
  });

  const product = await db.get("SELECT stock FROM products WHERE id = ?", ["prod-1"]);
  const orderItems = await db.all("SELECT * FROM order_items WHERE order_id = ?", ["order-1"]);

  assert.deepEqual(result, { id: "order-1", success: true });
  assert.equal(product.stock, 3);
  assert.equal(orderItems.length, 1);

  db.close();
});

test("return records the return and restores product stock", async () => {
  const db = await migratedDb();
  await db.run(
    "INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["prod-1", "default", "Cotton Suit", "SKU-1", 100, 80, 3],
  );
  await createOrder(db, {
    id: "order-1",
    store_id: "default",
    customer_name: "Cash Customer",
    subtotal: 200,
    total: 200,
    payment_method: "cash",
    items: [{ productId: "prod-1", name: "Cotton Suit", price: 100, quantity: 2, total: 200, priceType: "retail" }],
  });

  await recordReturn(db, {
    id: "return-1",
    orderId: "order-1",
    storeId: "default",
    value: 100,
    items: [{ productId: "prod-1", name: "Cotton Suit", quantity: 1, price: 100, total: 100, unit: "suit" }],
  });

  const product = await db.get("SELECT stock FROM products WHERE id = ?", ["prod-1"]);
  const returnRow = await db.get("SELECT * FROM returns WHERE id = ?", ["return-1"]);
  const order = await db.get("SELECT status FROM orders WHERE id = ?", ["order-1"]);
  const returnedItems = JSON.parse(returnRow.items_json);

  assert.equal(product.stock, 2);
  assert.equal(returnRow.return_value, 100);
  assert.equal(returnedItems[0].unit, "suit");
  assert.equal(order.status, "returned");

  db.close();
});

test("return rejects quantities greater than the original purchase", async () => {
  const db = await migratedDb();
  await db.run(
    "INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["prod-1", "default", "Cotton Suit", "SKU-1", 100, 80, 3],
  );
  await createOrder(db, {
    id: "order-1",
    store_id: "default",
    customer_name: "Cash Customer",
    subtotal: 100,
    total: 100,
    payment_method: "cash",
    items: [{ productId: "prod-1", name: "Cotton Suit", price: 100, quantity: 1, total: 100, priceType: "retail" }],
  });

  await assert.rejects(
    () => recordReturn(db, {
      id: "return-1",
      orderId: "order-1",
      storeId: "default",
      value: 200,
      items: [{ productId: "prod-1", name: "Cotton Suit", quantity: 2, price: 100, total: 200 }],
    }),
    /exceeds purchased quantity/,
  );

  db.close();
});

test("POS product search treats All as unfiltered and brand names as filters", async () => {
  const db = await migratedDb();
  await db.run("INSERT INTO brands (id, store_id, name) VALUES (?, ?, ?)", ["brand-1", "default", "Acme"]);
  await db.run("INSERT INTO brands (id, store_id, name) VALUES (?, ?, ?)", ["brand-2", "default", "Bravo"]);
  await db.run(
    "INSERT INTO products (id, store_id, name, sku, brand_id, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["prod-1", "default", "Acme Shirt", "ACME-1", "brand-1", 100, 80, 5],
  );
  await db.run(
    "INSERT INTO products (id, store_id, name, sku, brand_id, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["prod-2", "default", "Bravo Pants", "BRAVO-1", "brand-2", 120, 90, 4],
  );

  const allProducts = await searchProducts(db, { search: "", category: "All", store_id: "default" });
  const acmeProducts = await searchProducts(db, { search: "", category: "Acme", store_id: "default" });

  assert.deepEqual(allProducts.map((product) => product.id), ["prod-1", "prod-2"]);
  assert.deepEqual(acmeProducts.map((product) => product.id), ["prod-1"]);

  db.close();
});

test("exchange finalization atomically records return and replacement order", async () => {
  const db = await migratedDb();
  await db.run("INSERT INTO customers (id, store_id, name) VALUES (?, ?, ?)", ["cust-1", "default", "Aisha"]);
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["old-1", "default", "Old Shirt", "OLD", 100, 80, 3]);
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["new-1", "default", "New Shirt", "NEW", 100, 80, 5]);
  await createOrder(db, {
    id: "order-original",
    store_id: "default",
    customer_id: "cust-1",
    customer_name: "Aisha",
    subtotal: 100,
    total: 100,
    payment_method: "cash",
    items: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 1, total: 100, priceType: "retail" }],
  });

  const result = await finalizeExchange(db, {
    id: "return-1",
    replacementOrderId: "order-exchange",
    storeId: "default",
    originalOrderId: "order-original",
    customerId: "cust-1",
    customerName: "Aisha",
    returnedItems: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 1, total: 100, unit: "yard" }],
    replacementItems: [{ productId: "new-1", name: "New Shirt", price: 100, quantity: 1, total: 100, priceType: "retail" }],
    paymentMethod: "exchange",
    staffId: "admin-001",
    balanceOutcome: "none",
  });

  const returnRow = await db.get("SELECT * FROM returns WHERE id = ?", ["return-1"]);
  const replacementOrder = await db.get("SELECT * FROM orders WHERE id = ?", ["order-exchange"]);
  const oldProduct = await db.get("SELECT stock FROM products WHERE id = ?", ["old-1"]);
  const newProduct = await db.get("SELECT stock FROM products WHERE id = ?", ["new-1"]);
  const returnItems = JSON.parse(returnRow.items_json);
  const replacementReturnedItems = JSON.parse(replacementOrder.returned_items_json);

  assert.equal(result.success, true);
  assert.equal(returnRow.replacement_order_id, "order-exchange");
  assert.equal(returnItems[0].unit, "yard");
  assert.equal(returnRow.balance_outcome, "none");
  assert.equal(replacementOrder.original_order_id, "order-original");
  assert.equal(replacementReturnedItems[0].unit, "yard");
  assert.equal(replacementOrder.total, 0);
  assert.equal(oldProduct.stock, 3);
  assert.equal(newProduct.stock, 4);

  db.close();
});

test("exchange finalization records extra amount due when replacement costs more", async () => {
  const db = await migratedDb();
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["old-1", "default", "Old Shirt", "OLD", 100, 80, 3]);
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["new-1", "default", "Premium Shirt", "NEW", 150, 120, 5]);
  await createOrder(db, { id: "order-original", store_id: "default", customer_name: "Cash Customer", subtotal: 100, total: 100, payment_method: "cash", items: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 1, total: 100, priceType: "retail" }] });

  await finalizeExchange(db, {
    id: "return-1",
    replacementOrderId: "order-exchange",
    storeId: "default",
    originalOrderId: "order-original",
    returnedItems: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 1, total: 100 }],
    replacementItems: [{ productId: "new-1", name: "Premium Shirt", price: 150, quantity: 1, total: 150, priceType: "retail" }],
    paymentMethod: "cash",
    balanceOutcome: "extra_paid",
  });

  const returnRow = await db.get("SELECT amount_due, remaining_balance, balance_outcome FROM returns WHERE id = ?", ["return-1"]);
  const replacementOrder = await db.get("SELECT subtotal, store_credit_used, total FROM orders WHERE id = ?", ["order-exchange"]);

  assert.equal(returnRow.amount_due, 50);
  assert.equal(returnRow.remaining_balance, 0);
  assert.equal(returnRow.balance_outcome, "extra_paid");
  assert.equal(replacementOrder.subtotal, 150);
  assert.equal(replacementOrder.store_credit_used, 100);
  assert.equal(replacementOrder.total, 50);

  db.close();
});

test("exchange finalization records remaining balance as cash refund", async () => {
  const db = await migratedDb();
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["old-1", "default", "Old Shirt", "OLD", 100, 80, 3]);
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["new-1", "default", "Small Item", "NEW", 60, 50, 5]);
  await createOrder(db, { id: "order-original", store_id: "default", customer_name: "Cash Customer", subtotal: 100, total: 100, payment_method: "cash", items: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 1, total: 100, priceType: "retail" }] });

  await finalizeExchange(db, {
    id: "return-1",
    replacementOrderId: "order-exchange",
    storeId: "default",
    originalOrderId: "order-original",
    returnedItems: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 1, total: 100 }],
    replacementItems: [{ productId: "new-1", name: "Small Item", price: 60, quantity: 1, total: 60, priceType: "retail" }],
    paymentMethod: "exchange",
    balanceOutcome: "cash_refund",
  });

  const returnRow = await db.get("SELECT amount_due, remaining_balance, balance_outcome FROM returns WHERE id = ?", ["return-1"]);
  const replacementOrder = await db.get("SELECT subtotal, store_credit_used, total FROM orders WHERE id = ?", ["order-exchange"]);

  assert.equal(returnRow.amount_due, 0);
  assert.equal(returnRow.remaining_balance, 40);
  assert.equal(returnRow.balance_outcome, "cash_refund");
  assert.equal(replacementOrder.subtotal, 60);
  assert.equal(replacementOrder.store_credit_used, 60);
  assert.equal(replacementOrder.total, 0);

  db.close();
});

test("exchange finalization stores remaining balance as customer credit", async () => {
  const db = await migratedDb();
  await db.run("INSERT INTO customers (id, store_id, name, store_credit_balance) VALUES (?, ?, ?, ?)", ["cust-1", "default", "Aisha", 5]);
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["old-1", "default", "Old Shirt", "OLD", 100, 80, 3]);
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["new-1", "default", "Small Item", "NEW", 60, 50, 5]);
  await createOrder(db, { id: "order-original", store_id: "default", customer_id: "cust-1", customer_name: "Aisha", subtotal: 100, total: 100, payment_method: "cash", items: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 1, total: 100, priceType: "retail" }] });

  await finalizeExchange(db, {
    id: "return-1",
    replacementOrderId: "order-exchange",
    storeId: "default",
    originalOrderId: "order-original",
    customerId: "cust-1",
    customerName: "Aisha",
    returnedItems: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 1, total: 100 }],
    replacementItems: [{ productId: "new-1", name: "Small Item", price: 60, quantity: 1, total: 60, priceType: "retail" }],
    paymentMethod: "exchange",
    balanceOutcome: "store_credit",
  });

  const customer = await db.get("SELECT store_credit_balance FROM customers WHERE id = ?", ["cust-1"]);
  const logs = await db.all("SELECT * FROM customer_credit_logs WHERE customer_id = ?", ["cust-1"]);

  assert.equal(customer.store_credit_balance, 45);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].amount, 40);
  assert.equal(logs[0].balance_after, 45);

  db.close();
});

test("exchange finalization rejects over-return without changing stock", async () => {
  const db = await migratedDb();
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["old-1", "default", "Old Shirt", "OLD", 100, 80, 3]);
  await db.run("INSERT INTO products (id, store_id, name, sku, price, wholesale_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)", ["new-1", "default", "New Shirt", "NEW", 100, 80, 5]);
  await createOrder(db, { id: "order-original", store_id: "default", customer_name: "Cash Customer", subtotal: 100, total: 100, payment_method: "cash", items: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 1, total: 100, priceType: "retail" }] });

  await assert.rejects(() => finalizeExchange(db, {
    id: "return-1",
    replacementOrderId: "order-exchange",
    storeId: "default",
    originalOrderId: "order-original",
    returnedItems: [{ productId: "old-1", name: "Old Shirt", price: 100, quantity: 2, total: 200 }],
    replacementItems: [{ productId: "new-1", name: "New Shirt", price: 100, quantity: 1, total: 100, priceType: "retail" }],
    paymentMethod: "exchange",
    balanceOutcome: "none",
  }), /exceeds remaining quantity/);

  const returns = await db.all("SELECT * FROM returns");
  const oldProduct = await db.get("SELECT stock FROM products WHERE id = ?", ["old-1"]);
  const newProduct = await db.get("SELECT stock FROM products WHERE id = ?", ["new-1"]);

  assert.equal(returns.length, 0);
  assert.equal(oldProduct.stock, 2);
  assert.equal(newProduct.stock, 5);

  db.close();
});

test("sync operation mapping covers core queued actions", () => {
  assert.equal(prepareSyncOperation({ actionType: "PRODUCT_UPSERT", entityId: "p1", payload: { id: "p1" } }).table, "products");
  assert.equal(prepareSyncOperation({ actionType: "BRAND_UPSERT", entityId: "b1", payload: { id: "b1" } }).table, "brands");
  assert.equal(prepareSyncOperation({ actionType: "CUSTOMER_UPDATE", entityId: "c1", payload: { id: "c1" } }).table, "customers");
  assert.equal(prepareSyncOperation({ actionType: "ORDER_UPDATE", entityId: "o1", payload: { id: "o1", status: "returned" } }).table, "orders");
  assert.equal(prepareSyncOperation({ actionType: "ORDER_RETURN", entityId: "o1", payload: { id: "o1" } }).table, "returns");
  assert.equal(prepareSyncOperation({ actionType: "CUSTOMER_CREDIT_LOG", entityId: "log-1", payload: { id: "log-1" } }).table, "customer_credit_logs");
  assert.equal(prepareSyncOperation({ actionType: "PRODUCT_DELETE", entityId: "p1", payload: { id: "p1" } }).operation, "delete");
  assert.equal(prepareSyncOperation({ actionType: "UNKNOWN", entityId: "x", payload: {} }), null);
});

test("staff PIN hashes verify without storing the original PIN", async () => {
  const db = await migratedDb();
  const owner = await db.get("SELECT pin, pin_hash FROM staff WHERE role = 'owner'");

  assert.equal(owner.pin, "");
  assert.equal(verifyPin("123456", owner.pin_hash), true);

  const hash = hashPin("654321");
  assert.equal(hash.includes("654321"), false);
  assert.equal(verifyPin("654321", hash), true);
  assert.equal(verifyPin("111111", hash), false);

  db.close();
});

test("inventory maintenance does not clear sales, customers, settings, or sync state", () => {
  const sql = getMaintenanceOperations("inventory", "default").map((operation) => operation.sql).join("\n");

  assert.equal(sql.includes("orders"), false);
  assert.equal(sql.includes("customers"), false);
  assert.equal(sql.includes("settings"), false);
  assert.equal(sql.includes("sync_queue"), false);
  assert.equal(sql.includes("products"), true);
  assert.equal(sql.includes("brands"), true);
});

test("asset protocol preserves product image paths with spaces and URL characters", () => {
  const filePath = "/Users/example/Library/Application Support/inventoriman/product-images/Fancy #1?.png";
  const assetUrl = toAssetUrl(filePath);

  assert.equal(assetUrl.startsWith("app-assets://local/"), true);
  assert.equal(assetUrlToPath(assetUrl), filePath);
  assert.equal(assetUrlToPath(`app-assets://${filePath}`), filePath);
  assert.equal(toFetchableFileUrl(filePath), "file:///Users/example/Library/Application%20Support/inventoriman/product-images/Fancy%20%231%3F.png");
});
