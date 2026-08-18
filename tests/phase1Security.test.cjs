const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const Database = require("better-sqlite3");
const { runMigrations } = require("../electron/migrations.cjs");
const { hashPin } = require("../electron/pinService.cjs");
const fs = require("node:fs");
const { createIpcRouter } = require("../electron/ipcRouter.cjs");
const { registerApplicationIpc } = require("../electron/applicationIpc.cjs");
const { buildContentSecurityPolicy } = require("../electron/contentSecurityPolicy.cjs");
const {
  SessionManager,
  SecurityError,
  assertExactKeys,
  assertPlainObject,
  formatPinLockoutMessage,
  isTrustedRendererUrl,
  roleAllows,
} = require("../electron/ipcSecurity.cjs");

function createMemoryDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  return {
    close: () => sqlite.close(),
    all: async (sql, params = []) => sqlite.prepare(sql).all(...params),
    get: async (sql, params = []) => sqlite.prepare(sql).get(...params),
    run: async (sql, params = []) => sqlite.prepare(sql).run(...params),
    transaction: async (queries) => sqlite.transaction((ops) => ops.forEach((op) => sqlite.prepare(op.sql).run(...(op.params || []))))(queries),
  };
}

async function securityDb() {
  const db = createMemoryDb();
  await runMigrations(db);
  await db.run("UPDATE staff SET pin = '', pin_hash = ?, requires_pin_setup = 0 WHERE role = 'owner'", [hashPin("111111")]);
  for (const [id, role, pin] of [
    ["admin-1", "admin", "222222"],
    ["manager-1", "manager", "333333"],
    ["cashier-1", "cashier", "444444"],
  ]) {
    await db.run(
      "INSERT INTO staff (id, store_id, name, pin, pin_hash, role, status, requires_pin_setup) VALUES (?, 'default', ?, '', ?, ?, 'active', 0)",
      [id, role, hashPin(pin), role],
    );
  }
  return db;
}

test("permission matrix enforces cashier, manager, admin, and owner boundaries", () => {
  assert.equal(roleAllows("cashier", "pos:use"), true);
  assert.equal(roleAllows("cashier", "inventory:manage"), false);
  assert.equal(roleAllows("manager", "inventory:manage"), true);
  assert.equal(roleAllows("manager", "staff:manage"), false);
  assert.equal(roleAllows("admin", "staff:manage"), true);
  assert.equal(roleAllows("owner", "database:manage"), true);
});

test("main-process sessions derive staff, role, and store instead of trusting renderer identity", async () => {
  const db = await securityDb();
  const sessions = new SessionManager(db);
  const session = await sessions.login(10, { pin: "333333" });

  assert.deepEqual(session, {
    id: "manager-1",
    name: "manager",
    role: "manager",
    status: "active",
    storeId: "default",
  });
  await assert.rejects(() => sessions.authorize(10, "staff:manage"), (error) => error.code === "PERMISSION_DENIED");
  await assert.rejects(() => sessions.authorize(999, "pos:use"), (error) => error.code === "AUTH_REQUIRED");
  db.close();
});

test("repeated incorrect PINs trigger a temporary lockout", async () => {
  const db = await securityDb();
  let now = 1_000;
  const sessions = new SessionManager(db, { now: () => now, maxAttempts: 3, lockoutMs: 60_000 });

  await assert.rejects(() => sessions.login(20, { pin: "999999" }), (error) => error.code === "INVALID_PIN");
  await assert.rejects(() => sessions.login(20, { pin: "999999" }), (error) => error.code === "INVALID_PIN");
  await assert.rejects(
    () => sessions.login(20, { pin: "999999" }),
    (error) => error.code === "PIN_LOCKED" && error.retryAfterMs === 60_000 && error.message.endsWith("Retry in 1m."),
  );
  now += 30_000;
  await assert.rejects(
    () => sessions.login(20, { pin: "111111" }),
    (error) => error.code === "PIN_LOCKED" && error.retryAfterMs === 30_000 && error.message.endsWith("Retry in 30s."),
  );

  now += 30_001;
  assert.equal((await sessions.login(20, { pin: "111111" })).role, "owner");
  db.close();
});

test("PIN lockout duration is formatted for the login screen", () => {
  assert.equal(formatPinLockoutMessage(270_261), "Too many incorrect PIN attempts. Retry in 4m 31s.");
  assert.equal(formatPinLockoutMessage(999), "Too many incorrect PIN attempts. Retry in 1s.");
});

test("login IPC returns expected authentication failures without throwing handler errors", async () => {
  const routes = new Map();
  const collect = (channel, ...args) => routes.set(channel, { validate: args.at(-2), handler: args.at(-1) });
  const sessionManager = {
    login: async () => {
      throw new SecurityError("PIN_LOCKED", formatPinLockoutMessage(45_001), { retryAfterMs: 45_001 });
    },
  };
  registerApplicationIpc({ router: { public: collect, authenticated: collect, secure: collect }, sessionManager });

  const route = routes.get("auth:login");
  const result = await route.handler({ event: { sender: { id: 20 } }, payload: route.validate({ pin: "999999" }) });

  assert.deepEqual(result, {
    success: false,
    error: {
      code: "PIN_LOCKED",
      message: "Too many incorrect PIN attempts. Retry in 46s.",
      retryAfterMs: 45_001,
    },
  });
});

test("first-run owner enrollment is single-use and stores only a PIN hash", async () => {
  const db = createMemoryDb();
  await runMigrations(db);
  const sessions = new SessionManager(db);

  assert.deepEqual(await sessions.getBootstrapState(), { requiresOwnerEnrollment: true });
  const owner = await sessions.enrollOwner(30, { name: "Store Owner", pin: "876543", confirmPin: "876543" });
  assert.equal(owner.role, "owner");
  const row = await db.get("SELECT pin, pin_hash, requires_pin_setup FROM staff WHERE id = ?", [owner.id]);
  assert.equal(row.pin, "");
  assert.match(row.pin_hash, /^scrypt:/);
  assert.equal(row.requires_pin_setup, 0);
  await assert.rejects(
    () => sessions.enrollOwner(31, { name: "Attacker", pin: "123456", confirmPin: "123456" }),
    (error) => error.code === "ENROLLMENT_CLOSED",
  );
  db.close();
});

test("strict payload helpers reject unknown, malformed, and oversized input", () => {
  assert.throws(() => assertExactKeys({ pin: "1234", role: "owner" }, ["pin"]), /unsupported field/);
  assert.throws(() => assertPlainObject("not-an-object"), /must be an object/);
  assert.throws(() => assertPlainObject({ value: "x".repeat(300_000) }), /exceeds/);
});

test("renderer trust accepts only the configured dev origin or packaged dist files", () => {
  const distPath = path.resolve(__dirname, "../dist");
  assert.equal(isTrustedRendererUrl("http://localhost:5173/settings", { isPackaged: false, distPath }), true);
  assert.equal(isTrustedRendererUrl("https://attacker.example", { isPackaged: false, distPath }), false);
  assert.equal(isTrustedRendererUrl(`file://${distPath}/index.html`, { isPackaged: true, distPath }), true);
  assert.equal(isTrustedRendererUrl("file:///tmp/evil.html", { isPackaged: true, distPath }), false);
});

test("CSP permits Vite React refresh only in development", () => {
  const developmentPolicy = buildContentSecurityPolicy({ isDevelopment: true });
  const productionPolicy = buildContentSecurityPolicy({ isDevelopment: false });

  assert.match(developmentPolicy, /script-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(productionPolicy, /script-src[^;]*'unsafe-inline'/);
  assert.match(productionPolicy, /script-src 'self'/);
  assert.match(productionPolicy, /object-src 'none'/);
});

test("unknown IPC channels have no handler and untrusted senders are rejected", async () => {
  const handlers = new Map();
  const ipcMain = { handle: (channel, handler) => handlers.set(channel, handler) };
  const sessions = {
    requireSession: async () => ({ id: "owner-1", role: "owner", storeId: "default" }),
    authorize: async () => ({ id: "owner-1", role: "owner", storeId: "default" }),
  };
  const router = createIpcRouter({ ipcMain, sessionManager: sessions, isTrustedSender: (event) => event.trusted, log: { warn() {} } });
  router.authenticated("known:operation", (payload) => payload, async () => ({ success: true }));

  assert.equal(handlers.has("unknown:operation"), false);
  await assert.rejects(() => handlers.get("known:operation")({ trusted: false, sender: { id: 1 } }, {}), (error) => error.code === "UNTRUSTED_RENDERER");
  assert.deepEqual(await handlers.get("known:operation")({ trusted: true, sender: { id: 1 } }, {}), { success: true });
});

test("business schemas reject renderer-supplied store and staff identities", () => {
  const routes = new Map();
  const collect = (channel, ...args) => routes.set(channel, { validate: args.at(-2) });
  const router = { public: collect, authenticated: collect, secure: collect };
  registerApplicationIpc({ router });

  assert.throws(() => routes.get("products:list").validate({ store_id: "attacker-store" }), /unsupported field/);
  assert.throws(() => routes.get("staff:create").validate({ name: "Forged", pin: "1234", role: "owner", store_id: "attacker-store" }), /unsupported field/);
  assert.throws(() => routes.get("inventory:adjustStock").validate({ productId: "p1", adjustment: 1, staffId: "owner-1" }), /unsupported field/);
});

test("business handlers persist session-derived store and staff identity", async () => {
  const db = await securityDb();
  const routes = new Map();
  const collect = (channel, ...args) => routes.set(channel, { validate: args.at(-2), handler: args.at(-1) });
  registerApplicationIpc({ router: { public: collect, authenticated: collect, secure: collect }, db });
  const session = { id: "manager-1", role: "manager", storeId: "default" };

  const productInput = {
    product: { id: "product-1", name: "Secure Product", description: null, sku: "SEC-1", brand_id: null, price: 100, wholesale_price: 90, cost_price: 70, image: null, stock: 10, unit: "item", meters_per_unit: 1, hsn_code: null, tax_rate: 0 },
    rolls: [],
  };
  const productRoute = routes.get("products:upsert");
  await productRoute.handler({ payload: productRoute.validate(productInput), session });
  assert.equal((await db.get("SELECT store_id FROM products WHERE id='product-1'")).store_id, "default");

  const inventoryRoute = routes.get("inventory:adjustStock");
  const adjustment = inventoryRoute.validate({ productId: "product-1", adjustment: 2, reason: "Counted" });
  await inventoryRoute.handler({ payload: adjustment, session });
  const inventoryLog = await db.get("SELECT store_id,staff_id,current_stock FROM inventory_logs WHERE product_id='product-1'");
  assert.deepEqual(inventoryLog, { store_id: "default", staff_id: "manager-1", current_stock: 12 });
  db.close();
});

test("renderer surface contains no generic invoke or raw SQL bridge", () => {
  const preload = fs.readFileSync(path.resolve(__dirname, "../electron/preload.cjs"), "utf8");
  const rendererDatabase = fs.readFileSync(path.resolve(__dirname, "../src/services/database.ts"), "utf8");
  const rendererFiles = fs.readdirSync(path.resolve(__dirname, "../src"), { recursive: true })
    .filter((entry) => /\.(ts|tsx)$/.test(String(entry)))
    .map((entry) => fs.readFileSync(path.resolve(__dirname, "../src", String(entry)), "utf8"))
    .join("\n");

  assert.doesNotMatch(preload, /\binvoke\s*:\s*\(/);
  assert.doesNotMatch(preload, /db:(query|getOne|execute)/);
  assert.doesNotMatch(rendererDatabase, /\b(query|execute|getOne)\s*\(/);
  assert.doesNotMatch(rendererFiles, /electronAPI\.invoke|dbService\.(query|execute|getOne)/);
});
