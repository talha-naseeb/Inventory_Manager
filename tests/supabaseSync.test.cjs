const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const {
  isServiceRoleKey,
  normalizeStoreActivation,
  normalizeSyncSettings,
} = require("../electron/supabaseSyncConfig.cjs");
const { prepareSyncOperation } = require("../electron/syncPayloads.cjs");

function unsignedJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

test("Supabase sync config rejects service-role keys and preserves existing keys on URL updates", () => {
  const serviceRoleKey = unsignedJwt({ role: "service_role" });
  const anonKey = unsignedJwt({ role: "anon" });

  assert.equal(isServiceRoleKey(serviceRoleKey), true);
  assert.equal(isServiceRoleKey(anonKey), false);

  assert.deepEqual(normalizeSyncSettings({
    url: "https://example.supabase.co",
    key: "",
    currentKey: anonKey,
  }), {
    url: "https://example.supabase.co",
    key: anonKey,
  });

  assert.throws(
    () => normalizeSyncSettings({ url: "https://example.supabase.co", key: serviceRoleKey, currentKey: null }),
    /Service-role keys must not be saved/,
  );
});

test("store activation requires a real pilot store and normalized user metadata", () => {
  assert.deepEqual(normalizeStoreActivation({
    storeId: " Store_A-01 ",
    storeName: "  Downtown Branch  ",
    userEmail: " OWNER@EXAMPLE.COM ",
  }), {
    storeId: "Store_A-01",
    storeName: "Downtown Branch",
    userEmail: "owner@example.com",
  });

  assert.throws(
    () => normalizeStoreActivation({ storeId: "default", storeName: "Default", userEmail: "owner@example.com" }),
    /Store activation requires a non-default store ID/,
  );
});

test("Cloud sync setup SQL includes RLS guidance and every remotely synced table", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/components/settings/CloudSyncSettings.tsx"), "utf8");
  const syncedTables = [
    "products",
    "brands",
    "customers",
    "orders",
    "order_items",
    "returns",
    "rolls",
    "inventory_logs",
    "customer_credit_logs",
  ];

  for (const table of syncedTables) {
    assert.match(source, new RegExp(`create table if not exists ${table}`), `${table} missing from setup SQL`);
    assert.match(source, new RegExp(`alter table ${table} enable row level security`), `${table} missing RLS enablement`);
  }

  assert.match(source, /service-role keys must never be used/i);
  assert.match(source, /store_id/i);
  assert.match(source, /create table if not exists stores/i);
  assert.match(source, /create table if not exists store_members/i);
  assert.match(source, /auth\.uid\(\)/i);
  assert.doesNotMatch(source, /x-store-id/i);
  assert.doesNotMatch(source, /to anon/i);
});

test("sync payloads are normalized to store-scoped Supabase columns", () => {
  const product = prepareSyncOperation({
    actionType: "PRODUCT_UPSERT",
    entityId: "prod-1",
    payload: {
      id: "prod-1",
      store_id: "store-a",
      name: "Cotton",
      wholesalePrice: 80,
      costPrice: 50,
      price: 100,
      unknownClientField: "drop-me",
    },
  });

  assert.equal(product.storeId, "store-a");
  assert.deepEqual(product.payload, {
    id: "prod-1",
    store_id: "store-a",
    name: "Cotton",
    price: 100,
    wholesale_price: 80,
    cost_price: 50,
  });

  const order = prepareSyncOperation({
    actionType: "ORDER_CREATE",
    entityId: "order-1",
    payload: {
      id: "order-1",
      store_id: "store-a",
      customerId: "cust-1",
      customerName: "Aisha",
      paymentMethod: "cash",
      storeCreditUsed: 10,
      total: 90,
      items: [
        { productId: "prod-1", name: "Cotton", price: 100, quantity: 1, total: 100, priceType: "retail" },
      ],
    },
  });

  assert.equal(order.storeId, "store-a");
  assert.equal(order.payload.customer_id, "cust-1");
  assert.equal(order.payload.customer_name, "Aisha");
  assert.equal(order.payload.payment_method, "cash");
  assert.equal(order.payload.store_credit_used, 10);
  assert.equal(order.payload.items, undefined);
  assert.deepEqual(order.related[0].payload, [{
    id: "order-1-prod-1",
    store_id: "store-a",
    order_id: "order-1",
    product_id: "prod-1",
    name: "Cotton",
    price: 100,
    quantity: 1,
    total: 100,
    price_type: "retail",
    unit: null,
    tax_rate: 0,
    tax_amount: 0,
  }]);

  const deletion = prepareSyncOperation({
    actionType: "PRODUCT_DELETE",
    entityId: "prod-1",
    payload: { id: "prod-1", store_id: "store-a" },
  });

  assert.equal(deletion.storeId, "store-a");
});

test("runtime sync and auth wiring require activation and store-scoped deletes", () => {
  const syncManagerSource = fs.readFileSync(path.join(repoRoot, "electron/syncManager.cjs"), "utf8");
  const applicationIpcSource = fs.readFileSync(path.join(repoRoot, "electron/applicationIpc.cjs"), "utf8");
  const authStoreSource = fs.readFileSync(path.join(repoRoot, "src/store/useAuthStore.ts"), "utf8");
  const preloadSource = fs.readFileSync(path.join(repoRoot, "electron/preload.cjs"), "utf8");

  assert.doesNotMatch(syncManagerSource, /ipcMain\.handle/);
  assert.match(applicationIpcSource, /router\.secure\("cloud:signIn", "sync:manage"/);
  assert.match(applicationIpcSource, /router\.secure\("cloud:signOut", "sync:manage"/);
  assert.match(applicationIpcSource, /router\.secure\("cloud:getSession", "sync:manage"/);
  assert.match(preloadSource, /cloud:\s*\{/);
  assert.doesNotMatch(authStoreSource, /Mock JWT|api\.inventoriman\.com|store_abc_123/);
  assert.doesNotMatch(syncManagerSource, /"x-store-id"/);
  assert.match(syncManagerSource, /isSyncReady\(\)/);
  assert.match(syncManagerSource, /\.delete\(\)\.eq\("id", operation\.entityId\)\.eq\("store_id", operation\.storeId\)/);
});

test("cloud sync settings UI exposes store activation controls", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/components/settings/CloudSyncSettings.tsx"), "utf8");

  assert.match(source, /cloudEmail/);
  assert.match(source, /cloudPassword/);
  assert.match(source, /activationStoreId/);
  assert.match(source, /window\.electronAPI\.cloud\.signIn/);
  assert.match(source, /Activate Store/);
});

test("main process sync queue derives the active store from the authenticated session", () => {
  const databaseSource = fs.readFileSync(path.join(repoRoot, "src/services/database.ts"), "utf8");
  const applicationIpcSource = fs.readFileSync(path.join(repoRoot, "electron/applicationIpc.cjs"), "utf8");

  assert.doesNotMatch(databaseSource, /INSERT INTO sync_queue|enqueueSync/);
  assert.match(applicationIpcSource, /function queueOperation\(db, storeId/);
  assert.match(applicationIpcSource, /queueOperation\(db, session\.storeId/);
  assert.match(applicationIpcSource, /base_version_json, conflict_status/);
});
