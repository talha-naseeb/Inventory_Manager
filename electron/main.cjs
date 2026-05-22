const { app, BrowserWindow, ipcMain, shell, protocol, net } = require("electron");
const path = require("path");
const { db, initDb } = require("./db.cjs");
const { log, logStartup, getLogFilePath } = require("./logger.cjs");
const { initLicenseTable, getLicenseStatus, activateLicense } = require("./licenseService.cjs");
const SyncManager = require("./syncManager.cjs");
const { createOrder } = require("./orderService.cjs");
const { recordReturn } = require("./returnService.cjs");
const { finalizeExchange } = require("./exchangeService.cjs");
const { clearData } = require("./databaseMaintenance.cjs");
const { searchProducts } = require("./productSearchService.cjs");
const { hashPin, verifyPin } = require("./pinService.cjs");
const { assetUrlToPath, toAssetUrl, toFetchableFileUrl } = require("./assetProtocol.cjs");
const crypto = require("crypto");
const fs = require("fs");

// Register custom protocol for local assets
protocol.registerSchemesAsPrivileged([
  { scheme: "app-assets", privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

let mainWindow = null;
let syncManager = null;
const VALID_BUSINESS_TYPES = new Set(["textile", "grocery", "icecream", "electronics", "pharmacy", "bakery", "restaurant", "general"]);
const MAX_CUSTOM_STOCK_UNIT_LENGTH = 64;

function normalizeBusinessProfileSettings(args = {}) {
  const input = args && typeof args === "object" ? args : {};
  const businessType = typeof input.businessType === "string" ? input.businessType : "general";
  if (!VALID_BUSINESS_TYPES.has(businessType)) {
    return { success: false, error: "Invalid business type" };
  }

  const customStockUnit = typeof input.customStockUnit === "string" ? input.customStockUnit.trim() : "";
  if (customStockUnit.length > MAX_CUSTOM_STOCK_UNIT_LENGTH) {
    return { success: false, error: `Custom stock unit must be ${MAX_CUSTOM_STOCK_UNIT_LENGTH} characters or fewer` };
  }

  return { success: true, settings: { businessType, customStockUnit } };
}

function createWindow() {
  const isDev = !app.isPackaged;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true, // Security hardened
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Initialize Sync Manager
  syncManager = new SyncManager(mainWindow);
  syncManager.start();

  // Initialize auto-updater in production only
  if (!isDev) {
    try {
      const { initUpdater } = require("./updater.cjs");
      initUpdater(mainWindow);
    } catch (err) {
      log.error("Updater initialization failed:", err);
    }
  }
}

app.whenReady().then(async () => {
  // Set up the app-assets protocol handler
  protocol.handle("app-assets", (request) => {
    const filePath = assetUrlToPath(request.url);
    
    // Security check: Ensure the file is within the userData directory
    const userDataPath = app.getPath("userData");
    const relativePath = path.relative(userDataPath, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return new Response("Forbidden", { status: 403 });
    }

    return net.fetch(toFetchableFileUrl(filePath));
  });

  await initDb();
  await initLicenseTable();

  logStartup(app.getVersion());
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ── IPC: Generic DB Access ───────────────────────────────────────────────────
ipcMain.handle("db:query", async (event, sql, params = []) => {
  return db.all(sql, params);
});

ipcMain.handle("db:getOne", async (event, sql, params = []) => {
  return db.get(sql, params);
});

ipcMain.handle("db:execute", async (event, sql, params = []) => {
  return db.run(sql, params);
});

// ── IPC: Settings ─────────────────────────────────────────────────────────────
ipcMain.handle("api:settings:getBusinessProfile", async () => {
  try {
    const rows = await db.all("SELECT key, value FROM settings WHERE key IN (?, ?)", ["business_type", "custom_stock_unit"]);
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const businessType = VALID_BUSINESS_TYPES.has(settings.business_type) ? settings.business_type : "general";

    return {
      businessType,
      customStockUnit: settings.custom_stock_unit ?? "",
    };
  } catch (err) {
    log.error("Get Business Profile Settings Error:", err);
    return { businessType: "general", customStockUnit: "" };
  }
});

ipcMain.handle("api:settings:setBusinessProfile", async (event, args = {}) => {
  try {
    const normalized = normalizeBusinessProfileSettings(args);
    if (!normalized.success) return { success: false, error: normalized.error };

    const { businessType, customStockUnit } = normalized.settings;
    const sql = "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP";
    await db.transaction([
      { sql, params: ["business_type", businessType] },
      { sql, params: ["custom_stock_unit", customStockUnit] },
    ]);

    return { success: true };
  } catch (err) {
    log.error("Set Business Profile Settings Error:", err);
    return { success: false, error: err.message };
  }
});

// ── IPC: File Dialog ──────────────────────────────────────────────────────────
ipcMain.handle("dialog:openFile", async () => {
  const { dialog } = require("electron");
  const fs = require("fs");

  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const sourcePath = result.filePaths[0];
  const fileName = path.basename(sourcePath);
  const userDataPath = app.getPath("userData");
  const assetsDir = path.join(userDataPath, "product-images");
  const fs2 = require("fs");
  if (!fs2.existsSync(assetsDir)) fs2.mkdirSync(assetsDir, { recursive: true });

  const timestamp = Date.now();
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const destFileName = `${baseName}_${timestamp}${ext}`;
  const destPath = path.join(assetsDir, destFileName);
  fs2.copyFileSync(sourcePath, destPath);
  return toAssetUrl(destPath);
});

// ── IPC: Reports ──────────────────────────────────────────────────────────────
ipcMain.handle("api:reports:getDashboardStats", async (event, { startDate, endDate, store_id = 'default' }) => {
  try {
    const dateFilter = startDate && endDate ? `AND created_at BETWEEN ? AND ?` : "";
    const params = startDate && endDate ? [startDate, endDate] : [];

    const revenue = await db.get(`SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE store_id = ? ${dateFilter}`, [store_id, ...params]);
    const ordersCount = await db.get(`SELECT COUNT(*) as count FROM orders WHERE store_id = ? ${dateFilter}`, [store_id, ...params]);
    const productsCount = await db.get(`SELECT COUNT(*) as count FROM products WHERE store_id = ?`, [store_id]);
    const customersCount = await db.get(`SELECT COUNT(*) as count FROM customers WHERE store_id = ?`, [store_id]);

    return {
      totalRevenue: revenue?.total || 0,
      totalOrders: ordersCount?.count || 0,
      activeProducts: productsCount?.count || 0,
      totalCustomers: customersCount?.count || 0,
    };
  } catch (err) {
    log.error("Dashboard Stats Error:", err);
    throw err;
  }
});

ipcMain.handle("api:reports:getSalesTrend", async (event, { startDate, endDate, store_id = 'default' }) => {
  try {
    const dateFilter = startDate && endDate ? `AND created_at BETWEEN ? AND ?` : "";
    const params = startDate && endDate ? [startDate, endDate] : [];
    
    return await db.all(`
      SELECT strftime('%Y-%m-%d', created_at) as date, SUM(total) as sales, COUNT(id) as orders
      FROM orders
      WHERE store_id = ? ${dateFilter}
      GROUP BY date ORDER BY date ASC
    `, [store_id, ...params]);
  } catch (err) {
    log.error("Sales Trend Error:", err);
    throw err;
  }
});

// ── IPC: Orders ───────────────────────────────────────────────────────────────
ipcMain.handle("api:orders:list", async (event, { search, status, startDate, endDate, limit = 50, offset = 0, store_id = 'default' }) => {
  try {
    let sql = `
      SELECT o.*, COUNT(oi.id) as itemCount
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.store_id = ?
    `;
    const params = [store_id];

    if (search) {
      sql += " AND (o.id LIKE ? OR o.customer_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status && status !== "all") {
      sql += " AND o.status = ?";
      params.push(status);
    }
    if (startDate && endDate) {
      sql += " AND o.created_at BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    sql += " GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    return await db.all(sql, params);
  } catch (err) {
    log.error("Order List Error:", err);
    throw err;
  }
});

// ── IPC: Products ─────────────────────────────────────────────────────────────
ipcMain.handle("api:products:upsert", async (event, { product, store_id = 'default' }) => {
  try {
    const id = product.id || crypto.randomUUID();
    const sql = `
      INSERT INTO products (id, store_id, name, description, sku, brand_id, price, wholesale_price, cost_price, image, stock, unit, meters_per_unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, description=excluded.description, sku=excluded.sku, brand_id=excluded.brand_id,
        price=excluded.price, wholesale_price=excluded.wholesale_price, cost_price=excluded.cost_price,
        image=excluded.image, stock=excluded.stock, unit=excluded.unit, meters_per_unit=excluded.meters_per_unit
    `;
    await db.run(sql, [
      id, store_id, product.name, product.description, product.sku, product.brand_id,
      product.price, product.wholesale_price, product.cost_price, product.image,
      product.stock, product.unit, product.meters_per_unit
    ]);
    return id;
  } catch (err) {
    log.error("Product Upsert Error:", err);
    throw err;
  }
});

ipcMain.handle("api:products:delete", async (event, { id, store_id = 'default' }) => {
  try {
    // We use a transaction to ensure logs are deleted too
    await db.transaction([
      { sql: "DELETE FROM inventory_logs WHERE product_id = ? AND store_id = ?", params: [id, store_id] },
      { sql: "DELETE FROM products WHERE id = ? AND store_id = ?", params: [id, store_id] }
    ]);
    return { success: true };
  } catch (err) {
    log.error("Product Delete Error:", err);
    throw err;
  }
});

// ── IPC: Customers ────────────────────────────────────────────────────────────
ipcMain.handle("api:customers:search", async (event, { search, store_id = 'default' }) => {
  try {
    const sql = `
      SELECT 
        c.*,
        COUNT(o.id) as orderCount,
        COALESCE(SUM(o.total), 0) as totalSpent
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE (c.name LIKE ? OR c.phone LIKE ?) AND c.store_id = ? 
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    return await db.all(sql, [`%${search}%`, `%${search}%`, store_id]);
  } catch (err) {
    log.error("Search Customers Error:", err);
    throw err;
  }
});

ipcMain.handle("api:customers:getOrders", async (event, { customerId, store_id = 'default' }) => {
  try {
    const sql = `
      SELECT 
        o.id, o.total, o.status, o.payment_method, o.created_at,
        GROUP_CONCAT(oi.name || ' x' || oi.quantity, ', ') as items_summary
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.customer_id = ? AND o.store_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 20
    `;
    return await db.all(sql, [customerId, store_id]);
  } catch (err) {
    log.error("Get Customer Orders Error:", err);
    throw err;
  }
});

// ── IPC: Brands ───────────────────────────────────────────────────────────────
ipcMain.handle("api:brands:getAll", async (event, store_id = 'default') => {
  try {
    return await db.all("SELECT * FROM brands WHERE store_id = ? ORDER BY name ASC", [store_id]);
  } catch (err) {
    log.error("Get Brands Error:", err);
    throw err;
  }
});

ipcMain.handle("api:brands:create", async (event, { name, description = null, store_id = 'default' }) => {
  try {
    const id = crypto.randomUUID();
    await db.run("INSERT INTO brands (id, store_id, name, description) VALUES (?, ?, ?, ?)", [id, store_id, name, description]);
    return id;
  } catch (err) {
    log.error("Create Brand Error:", err);
    throw err;
  }
});

// ── IPC: Products (missing handlers) ─────────────────────────────────────────
ipcMain.handle("api:products:search", async (event, { search = '', category, store_id = 'default' }) => {
  try {
    return await searchProducts(db, { search, category, store_id });
  } catch (err) { log.error("Product Search Error:", err); throw err; }
});

ipcMain.handle("api:products:getBySku", async (event, { sku, store_id = 'default' }) => {
  try {
    return await db.get(
      "SELECT p.*, b.name as brand FROM products p LEFT JOIN brands b ON p.brand_id = b.id WHERE p.sku = ? AND p.store_id = ?",
      [sku, store_id]
    );
  } catch (err) { log.error("Get By SKU Error:", err); throw err; }
});

// ── IPC: Customers (missing handlers) ────────────────────────────────────────
ipcMain.handle("api:customers:create", async (event, { customer, store_id = 'default' }) => {
  try {
    const id = customer.id || crypto.randomUUID();
    await db.run(
      "INSERT INTO customers (id, store_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)",
      [id, store_id, customer.name, customer.phone || null, customer.email || null, customer.address || null]
    );
    return id;
  } catch (err) { log.error("Create Customer Error:", err); throw err; }
});

// ── IPC: Orders (missing handler) ─────────────────────────────────────────────
ipcMain.handle("api:orders:create", async (event, orderData) => {
  try {
    return await createOrder(db, orderData);
  } catch (err) { log.error("Create Order Error:", err); throw err; }
});

ipcMain.handle("api:returns:create", async (event, returnData) => {
  try {
    return await recordReturn(db, returnData);
  } catch (err) { log.error("Create Return Error:", err); return { success: false, error: err.message }; }
});

ipcMain.handle("api:exchanges:finalize", async (event, exchangeData) => {
  try {
    return await finalizeExchange(db, exchangeData);
  } catch (err) { log.error("Finalize Exchange Error:", err); return { success: false, error: err.message }; }
});

// ── IPC: Staff ────────────────────────────────────────────────────────────────
ipcMain.handle("api:staff:verifyPin", async (event, { pin, store_id = 'default' }) => {
  try {
    const staffRows = await db.all(
      "SELECT id, name, role, status, pin, pin_hash FROM staff WHERE status = 'active' AND (store_id = ? OR store_id = 'default')",
      [store_id]
    );
    const staff = staffRows.find((row) => verifyPin(pin, row.pin_hash) || (!row.pin_hash && row.pin === pin));
    if (!staff) return null;

    if (!staff.pin_hash && staff.pin) {
      await db.run("UPDATE staff SET pin_hash = ?, pin = '' WHERE id = ?", [hashPin(pin), staff.id]);
    }

    return { id: staff.id, name: staff.name, role: staff.role, status: staff.status };
  } catch (err) {
    log.error("Verify PIN Error:", err);
    throw err;
  }
});

ipcMain.handle("api:staff:logAction", async (event, { staff_id, action }) => {
  try {
    await db.run("INSERT INTO login_logs (id, staff_id, action) VALUES (?, ?, ?)", [crypto.randomUUID(), staff_id, action]);
    return { success: true };
  } catch (err) {
    log.error("Log Staff Action Error:", err);
    throw err;
  }
});

ipcMain.handle("api:staff:getAll", async (event, store_id = 'default') => {
  try {
    return await db.all("SELECT id, name, role, status, created_at FROM staff WHERE store_id = ? ORDER BY name ASC", [store_id]);
  } catch (err) { log.error("Get Staff Error:", err); throw err; }
});

ipcMain.handle("api:staff:create", async (event, { staff, store_id = 'default' }) => {
  try {
    const staffRows = await db.all("SELECT id, pin, pin_hash FROM staff WHERE store_id = ?", [store_id]);
    const exists = staffRows.find((row) => verifyPin(staff.pin, row.pin_hash) || (!row.pin_hash && row.pin === staff.pin));
    if (exists) throw new Error("A staff member with this PIN already exists.");
    const id = crypto.randomUUID();
    await db.run(
      "INSERT INTO staff (id, store_id, name, pin, pin_hash, role, status) VALUES (?, ?, ?, '', ?, ?, 'active')",
      [id, store_id, staff.name, hashPin(staff.pin), staff.role]
    );
    return { success: true, id };
  } catch (err) { log.error("Create Staff Error:", err); return { success: false, error: err.message }; }
});

ipcMain.handle("api:staff:update", async (event, { id, staff, store_id = 'default' }) => {
  try {
    if (staff.pin) {
      const staffRows = await db.all("SELECT id, pin, pin_hash FROM staff WHERE store_id = ? AND id != ?", [store_id, id]);
      const conflict = staffRows.find((row) => verifyPin(staff.pin, row.pin_hash) || (!row.pin_hash && row.pin === staff.pin));
      if (conflict) throw new Error("Another staff member already uses this PIN.");
      await db.run("UPDATE staff SET name=?, role=?, status=?, pin='', pin_hash=? WHERE id=? AND store_id=?",
        [staff.name, staff.role, staff.status, hashPin(staff.pin), id, store_id]);
    } else {
      await db.run("UPDATE staff SET name=?, role=?, status=? WHERE id=? AND store_id=?",
        [staff.name, staff.role, staff.status, id, store_id]);
    }
    return { success: true };
  } catch (err) { log.error("Update Staff Error:", err); return { success: false, error: err.message }; }
});

ipcMain.handle("api:staff:delete", async (event, { id, store_id = 'default' }) => {
  try {
    await db.run("DELETE FROM staff WHERE id=? AND store_id=?", [id, store_id]);
    return { success: true };
  } catch (err) { log.error("Delete Staff Error:", err); return { success: false, error: err.message }; }
});

// ── IPC: Inventory Adjust ─────────────────────────────────────────────────────
ipcMain.handle("api:inventory:adjustStock", async (event, { productId, adjustment, reason, staffId, store_id = 'default' }) => {
  try {
    const product = await db.get("SELECT stock FROM products WHERE id=? AND store_id=?", [productId, store_id]);
    if (!product) throw new Error("Product not found");
    const previousStock = product.stock;
    const newStock = Math.max(0, previousStock + adjustment);
    const logId = crypto.randomUUID();
    await db.transaction([
      { sql: "UPDATE products SET stock=? WHERE id=? AND store_id=?", params: [newStock, productId, store_id] },
      { sql: "INSERT INTO inventory_logs (id, store_id, product_id, action_type, quantity, previous_stock, current_stock, reason, staff_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params: [logId, store_id, productId, adjustment >= 0 ? 'STOCK_IN' : 'STOCK_OUT', Math.abs(adjustment), previousStock, newStock, reason || null, staffId || null] }
    ]);
    return { success: true, newStock, logId, previousStock };
  } catch (err) { log.error("Adjust Stock Error:", err); return { success: false, error: err.message }; }
});

// ── IPC: Database Maintenance ─────────────────────────────────────────────────
ipcMain.handle("api:database:clearData", async (event, { type, store_id = 'default', staff_id }) => {
  try {
    const staff = staff_id
      ? await db.get("SELECT role, status FROM staff WHERE id=? AND (store_id=? OR store_id='default')", [staff_id, store_id])
      : null;
    if (!staff || staff.status !== "active" || !["owner", "admin"].includes(staff.role)) {
      throw new Error("Owner or admin permission required");
    }
    return await clearData(db, type, store_id);
  } catch (err) {
    log.error("Database Maintenance Error:", err);
    return { success: false, error: err.message };
  }
});

// ── IPC: System Info ──────────────────────────────────────────────────────────
ipcMain.handle("license:getStatus", async () => {
  return getLicenseStatus();
});

ipcMain.handle("license:activate", async (event, key) => {
  const result = await activateLicense(key);
  if (result.success) log.info("License activated:", key);
  else log.warn("License activation failed:", result.error);
  return result;
});

// ── IPC: System Info ──────────────────────────────────────────────────────────
ipcMain.handle("system:getInfo", () => {
  const os = require("os");
  return {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    logFilePath: getLogFilePath(),
    userDataPath: app.getPath("userData"),
  };
});

ipcMain.handle("system:openLogFile", () => {
  shell.openPath(getLogFilePath());
});

// ── IPC: Update ───────────────────────────────────────────────────────────────
ipcMain.handle("update:install", () => {
  if (!isDev) {
    try {
      const { installUpdate } = require("./updater.cjs");
      installUpdate();
    } catch (err) {
      log.error("Install update failed:", err);
    }
  }
});
