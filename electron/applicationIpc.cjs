const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  SecurityError,
  assertExactKeys,
  assertPlainObject,
  readArray,
  readEnum,
  readNumber,
  readString,
  validatePin,
} = require("./ipcSecurity.cjs");
const { emptyPayload } = require("./ipcRouter.cjs");

const BUSINESS_TYPES = ["textile", "grocery", "icecream", "electronics", "pharmacy", "bakery", "restaurant", "general"];
const STAFF_ROLES = ["cashier", "manager", "admin", "owner"];
const STAFF_STATUSES = ["active", "inactive"];
const ORDER_STATUSES = ["all", "completed", "pending", "cancelled", "returned"];
const CLEAR_TYPES = ["inventory", "sales", "customers", "full"];

function id(value, label = "id") {
  return readString(value, label, { min: 1, max: 128, pattern: /^[A-Za-z0-9:_-]+$/ });
}

function optionalString(value, label, max = 1_000) {
  if (value === undefined || value === null || value === "") return null;
  return readString(value, label, { max });
}

function optionalDate(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = readString(value, label, { max: 64 });
  if (!Number.isFinite(Date.parse(normalized))) throw new SecurityError("INVALID_PAYLOAD", `${label} must be a valid date`);
  return normalized;
}

function validateDateRange(payload, extraKeys = []) {
  assertExactKeys(payload || {}, ["startDate", "endDate", ...extraKeys]);
  const startDate = optionalDate(payload?.startDate, "startDate");
  const endDate = optionalDate(payload?.endDate, "endDate");
  if (Boolean(startDate) !== Boolean(endDate)) throw new SecurityError("INVALID_PAYLOAD", "startDate and endDate must be provided together");
  return { startDate, endDate };
}

function validateProduct(input) {
  assertExactKeys(input, ["id", "name", "description", "sku", "brand_id", "price", "wholesale_price", "cost_price", "image", "stock", "unit", "meters_per_unit", "hsn_code", "tax_rate"], "product");
  return {
    id: input.id ? id(input.id, "product.id") : crypto.randomUUID(),
    name: readString(input.name, "product.name", { min: 1, max: 160 }),
    description: optionalString(input.description, "product.description", 2_000),
    sku: optionalString(input.sku, "product.sku", 80),
    brand_id: input.brand_id ? id(input.brand_id, "product.brand_id") : null,
    price: readNumber(input.price, "product.price", { min: 0, max: 1_000_000_000 }),
    wholesale_price: readNumber(input.wholesale_price ?? 0, "product.wholesale_price", { min: 0, max: 1_000_000_000 }),
    cost_price: readNumber(input.cost_price ?? 0, "product.cost_price", { min: 0, max: 1_000_000_000 }),
    image: optionalString(input.image, "product.image", 2_048),
    stock: readNumber(input.stock ?? 0, "product.stock", { min: 0, max: 1_000_000_000 }),
    unit: readString(input.unit || "item", "product.unit", { min: 1, max: 64 }),
    meters_per_unit: readNumber(input.meters_per_unit ?? 1, "product.meters_per_unit", { min: 0.000001, max: 1_000_000 }),
    hsn_code: optionalString(input.hsn_code, "product.hsn_code", 64),
    tax_rate: readNumber(input.tax_rate ?? 0, "product.tax_rate", { min: 0, max: 100 }),
  };
}

function validateRoll(input, index) {
  assertExactKeys(input, ["id", "roll_number", "initial_length", "current_length", "unit"], `rolls[${index}]`);
  return {
    id: input.id ? id(input.id, `rolls[${index}].id`) : crypto.randomUUID(),
    roll_number: optionalString(input.roll_number, `rolls[${index}].roll_number`, 80),
    initial_length: readNumber(Number(input.initial_length), `rolls[${index}].initial_length`, { min: 0, max: 1_000_000 }),
    current_length: readNumber(Number(input.current_length), `rolls[${index}].current_length`, { min: 0, max: 1_000_000 }),
    unit: readString(input.unit || "meter", `rolls[${index}].unit`, { min: 1, max: 64 }),
  };
}

function validateCustomer(input) {
  assertExactKeys(input, ["id", "name", "phone", "email", "address"], "customer");
  return {
    id: input.id ? id(input.id, "customer.id") : crypto.randomUUID(),
    name: readString(input.name, "customer.name", { min: 1, max: 160 }),
    phone: optionalString(input.phone, "customer.phone", 64),
    email: optionalString(input.email, "customer.email", 254),
    address: optionalString(input.address, "customer.address", 1_000),
  };
}

function validateOrderItem(input, index) {
  assertExactKeys(input, ["id", "product_id", "productId", "name", "price", "quantity", "total", "price_type", "priceType", "unit", "stock", "sku", "brand", "brand_id", "image", "description", "wholesalePrice", "wholesale_price", "costPrice", "cost_price", "metersPerUnit", "meters_per_unit", "lowStockAlert", "tax_rate", "hsn_code"], `items[${index}]`);
  const productId = input.product_id || input.productId;
  return {
    ...(input.id ? { id: id(String(input.id).replace(/-(retail|wholesale)$/, ""), `items[${index}].id`) } : {}),
    productId: productId ? id(productId, `items[${index}].productId`) : null,
    name: readString(input.name, `items[${index}].name`, { min: 1, max: 160 }),
    price: readNumber(Number(input.price), `items[${index}].price`, { min: 0, max: 1_000_000_000 }),
    quantity: readNumber(Number(input.quantity), `items[${index}].quantity`, { min: 0.000001, max: 1_000_000 }),
    total: readNumber(Number(input.total ?? Number(input.price) * Number(input.quantity)), `items[${index}].total`, { min: 0, max: 1_000_000_000 }),
    priceType: readEnum(input.price_type || input.priceType || "retail", `items[${index}].priceType`, ["retail", "wholesale", "return"]),
    unit: optionalString(input.unit, `items[${index}].unit`, 64),
  };
}

function queueOperation(db, storeId, actionType, entityId, payload, baseVersion = null) {
  return db.run(
    "INSERT INTO sync_queue (id, store_id, action_type, entity_id, payload_json, status, base_version_json, conflict_status) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, 'none')",
    [crypto.randomUUID(), storeId, actionType, entityId, JSON.stringify({ ...payload, store_id: storeId }), baseVersion ? JSON.stringify(baseVersion) : null],
  );
}

function registerApplicationIpc({
  router,
  sessionManager,
  db,
  app,
  dialog,
  shell,
  log,
  getLogFilePath,
  toAssetUrl,
  searchProducts,
  createOrder,
  recordReturn,
  finalizeExchange,
  clearData,
  hashPin,
  verifyPin,
  getLicenseStatus,
  activateLicense,
  getSyncManager,
}) {
  router.public("auth:getBootstrapState", emptyPayload, () => sessionManager.getBootstrapState());
  router.public("auth:login", (payload) => {
    assertExactKeys(payload, ["pin"]);
    return { pin: validatePin(payload.pin) };
  }, async ({ event, payload }) => {
    try {
      const session = await sessionManager.login(event.sender.id, payload);
      return { success: true, session };
    } catch (error) {
      if (error instanceof SecurityError && ["INVALID_PIN", "PIN_LOCKED"].includes(error.code)) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            ...(Number.isFinite(error.retryAfterMs) ? { retryAfterMs: error.retryAfterMs } : {}),
            ...(Number.isInteger(error.attemptsRemaining) ? { attemptsRemaining: error.attemptsRemaining } : {}),
          },
        };
      }
      throw error;
    }
  });
  router.public("auth:enrollOwner", (payload) => {
    assertExactKeys(payload, ["name", "pin", "confirmPin"]);
    return {
      name: readString(payload.name, "Owner name", { min: 2, max: 80 }),
      pin: validatePin(payload.pin),
      confirmPin: validatePin(payload.confirmPin, "PIN confirmation"),
    };
  }, ({ event, payload }) => sessionManager.enrollOwner(event.sender.id, payload));
  router.authenticated("auth:getSession", emptyPayload, ({ session }) => session);
  router.authenticated("auth:logout", emptyPayload, ({ event }) => sessionManager.logout(event.sender.id));

  router.secure("settings:getBusinessProfile", "session:use", emptyPayload, async () => {
    const rows = await db.all("SELECT key, value FROM settings WHERE key IN (?, ?)", ["business_type", "custom_stock_unit"]);
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      businessType: BUSINESS_TYPES.includes(values.business_type) ? values.business_type : "general",
      customStockUnit: values.custom_stock_unit || "",
    };
  });
  router.secure("settings:setBusinessProfile", "settings:edit", (payload) => {
    assertExactKeys(payload, ["businessType", "customStockUnit"]);
    return {
      businessType: readEnum(payload.businessType, "businessType", BUSINESS_TYPES),
      customStockUnit: readString(payload.customStockUnit || "", "customStockUnit", { max: 64 }),
    };
  }, async ({ payload }) => {
    const sql = "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP";
    await db.transaction([
      { sql, params: ["business_type", payload.businessType] },
      { sql, params: ["custom_stock_unit", payload.customStockUnit] },
    ]);
    return { success: true };
  });

  router.secure("files:selectProductImage", "inventory:manage", emptyPayload, async () => {
    const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }] });
    if (result.canceled || result.filePaths.length !== 1) return null;
    const sourcePath = result.filePaths[0];
    const assetsDir = path.join(app.getPath("userData"), "product-images");
    fs.mkdirSync(assetsDir, { recursive: true });
    const parsed = path.parse(sourcePath);
    const destination = path.join(assetsDir, `${parsed.name}_${Date.now()}${parsed.ext.toLowerCase()}`);
    fs.copyFileSync(sourcePath, destination);
    return toAssetUrl(destination);
  });

  router.secure("products:search", "pos:use", (payload) => {
    assertExactKeys(payload, ["search", "category"]);
    return {
      search: readString(payload.search || "", "search", { max: 160 }),
      category: readString(payload.category || "", "category", { max: 160 }),
    };
  }, ({ payload, session }) => searchProducts(db, { ...payload, store_id: session.storeId }));
  router.secure("products:getBySku", "pos:use", (payload) => {
    assertExactKeys(payload, ["sku"]);
    return { sku: readString(payload.sku, "sku", { min: 1, max: 80 }) };
  }, ({ payload, session }) => db.get("SELECT p.*, b.name AS brand FROM products p LEFT JOIN brands b ON p.brand_id=b.id WHERE p.sku=? AND p.store_id=?", [payload.sku, session.storeId]));
  router.secure("products:getRolls", "inventory:manage", (payload) => {
    assertExactKeys(payload, ["productId"]);
    return { productId: id(payload.productId, "productId") };
  }, ({ payload, session }) => db.all("SELECT id,roll_number,current_length,initial_length,unit FROM rolls WHERE product_id=? AND store_id=? AND status='active' ORDER BY created_at", [payload.productId, session.storeId]));
  router.secure("products:list", "inventory:manage", (payload) => {
    assertExactKeys(payload || {}, ["search", "brandId"]);
    return { search: readString(payload?.search || "", "search", { max: 160 }), brandId: payload?.brandId ? id(payload.brandId, "brandId") : null };
  }, async ({ payload, session }) => {
    let sql = "SELECT p.*, b.name AS brand FROM products p LEFT JOIN brands b ON p.brand_id=b.id WHERE p.store_id=?";
    const params = [session.storeId];
    if (payload.brandId) { sql += " AND p.brand_id=?"; params.push(payload.brandId); }
    if (payload.search) { sql += " AND (p.name LIKE ? OR p.sku LIKE ?)"; params.push(`%${payload.search}%`, `%${payload.search}%`); }
    return db.all(`${sql} ORDER BY p.created_at DESC`, params);
  });
  router.secure("products:upsert", "inventory:manage", (payload) => {
    assertExactKeys(payload, ["product", "rolls"]);
    const product = validateProduct(payload.product);
    const rolls = readArray(payload.rolls || [], "rolls", { max: 500 }).map(validateRoll);
    return { product, rolls };
  }, async ({ payload, session }) => {
    const { product, rolls } = payload;
    const prior = await db.get("SELECT * FROM products WHERE id=? AND store_id=?", [product.id, session.storeId]);
    const ops = [{
      sql: `INSERT INTO products (id, store_id, name, description, sku, brand_id, price, wholesale_price, cost_price, image, stock, unit, meters_per_unit, hsn_code, tax_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, sku=excluded.sku, brand_id=excluded.brand_id,
            price=excluded.price, wholesale_price=excluded.wholesale_price, cost_price=excluded.cost_price, image=excluded.image,
            stock=excluded.stock, unit=excluded.unit, meters_per_unit=excluded.meters_per_unit, hsn_code=excluded.hsn_code, tax_rate=excluded.tax_rate`,
      params: [product.id, session.storeId, product.name, product.description, product.sku, product.brand_id, product.price, product.wholesale_price, product.cost_price, product.image, product.stock, product.unit, product.meters_per_unit, product.hsn_code, product.tax_rate],
    }, { sql: "DELETE FROM rolls WHERE product_id=? AND store_id=?", params: [product.id, session.storeId] }];
    for (const roll of rolls) ops.push({ sql: "INSERT INTO rolls (id, store_id, product_id, roll_number, initial_length, current_length, unit) VALUES (?, ?, ?, ?, ?, ?, ?)", params: [roll.id, session.storeId, product.id, roll.roll_number, roll.initial_length, roll.current_length, roll.unit] });
    await db.transaction(ops);
    await queueOperation(db, session.storeId, "PRODUCT_UPSERT", product.id, product, prior);
    return product.id;
  });
  router.secure("products:delete", "product:delete", (payload) => { assertExactKeys(payload, ["id"]); return { id: id(payload.id) }; }, async ({ payload, session }) => {
    const prior = await db.get("SELECT * FROM products WHERE id=? AND store_id=?", [payload.id, session.storeId]);
    await db.transaction([
      { sql: "DELETE FROM inventory_logs WHERE product_id=? AND store_id=?", params: [payload.id, session.storeId] },
      { sql: "DELETE FROM products WHERE id=? AND store_id=?", params: [payload.id, session.storeId] },
    ]);
    await queueOperation(db, session.storeId, "PRODUCT_DELETE", payload.id, { id: payload.id }, prior);
    return { success: true };
  });
  router.secure("products:bulkImport", "inventory:manage", (payload) => {
    assertExactKeys(payload, ["products"]);
    return { products: readArray(payload.products, "products", { min: 1, max: 2_000 }).map((product) => {
      assertExactKeys(product, ["name", "sku", "brand", "price", "wholesalePrice", "costPrice", "stock", "unit", "metersPerUnit", "description"], "import product");
      return {
        name: readString(product.name, "product.name", { min: 1, max: 160 }), sku: optionalString(product.sku, "product.sku", 80), brand: optionalString(product.brand, "product.brand", 160),
        price: readNumber(product.price, "product.price", { min: 0 }), wholesalePrice: readNumber(product.wholesalePrice, "product.wholesalePrice", { min: 0 }), costPrice: readNumber(product.costPrice, "product.costPrice", { min: 0 }),
        stock: readNumber(product.stock, "product.stock", { min: 0 }), unit: readString(product.unit || "item", "product.unit", { min: 1, max: 64 }), metersPerUnit: readNumber(product.metersPerUnit || 1, "product.metersPerUnit", { min: 0.000001 }), description: optionalString(product.description, "product.description", 2_000),
      };
    }) };
  }, async ({ payload, session }) => {
    for (const input of payload.products) {
      let brandId = null;
      if (input.brand) {
        let brand = await db.get("SELECT id FROM brands WHERE name=? AND store_id=?", [input.brand, session.storeId]);
        if (!brand) { brand = { id: crypto.randomUUID() }; await db.run("INSERT INTO brands (id, store_id, name) VALUES (?, ?, ?)", [brand.id, session.storeId, input.brand]); }
        brandId = brand.id;
      }
      const productId = crypto.randomUUID();
      await db.transaction([
        { sql: "INSERT INTO products (id, store_id, name, sku, brand_id, price, wholesale_price, cost_price, stock, unit, meters_per_unit, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", params: [productId, session.storeId, input.name, input.sku || `SKU-${productId.slice(0, 8).toUpperCase()}`, brandId, input.price, input.wholesalePrice, input.costPrice, input.stock, input.unit, input.metersPerUnit, input.description] },
        ...(input.stock > 0 ? [{ sql: "INSERT INTO inventory_logs (id, store_id, product_id, action_type, quantity, previous_stock, current_stock, reason, staff_id) VALUES (?, ?, ?, 'adjustment', ?, 0, ?, 'Bulk Import', ?)", params: [crypto.randomUUID(), session.storeId, productId, input.stock, input.stock, session.id] }] : []),
      ]);
      await queueOperation(db, session.storeId, "PRODUCT_UPSERT", productId, { ...input, id: productId, brand_id: brandId });
    }
    return { success: true, imported: payload.products.length };
  });

  router.secure("customers:search", "customers:manage", (payload) => { assertExactKeys(payload, ["search"]); return { search: readString(payload.search || "", "search", { max: 160 }) }; }, ({ payload, session }) => db.all(`SELECT c.*, COUNT(o.id) AS orderCount, COALESCE(SUM(o.total),0) AS totalSpent FROM customers c LEFT JOIN orders o ON o.customer_id=c.id WHERE (c.name LIKE ? OR c.phone LIKE ?) AND c.store_id=? GROUP BY c.id ORDER BY c.name`, [`%${payload.search}%`, `%${payload.search}%`, session.storeId]));
  router.secure("customers:getOrders", "customers:manage", (payload) => { assertExactKeys(payload, ["customerId"]); return { customerId: id(payload.customerId, "customerId") }; }, ({ payload, session }) => db.all(`SELECT o.id,o.total,o.status,o.payment_method,o.created_at,GROUP_CONCAT(oi.name || ' x' || oi.quantity, ', ') AS items_summary FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE o.customer_id=? AND o.store_id=? GROUP BY o.id ORDER BY o.created_at DESC LIMIT 20`, [payload.customerId, session.storeId]));
  router.secure("customers:create", "customers:manage", (payload) => { assertExactKeys(payload, ["customer"]); return validateCustomer(payload.customer); }, async ({ payload, session }) => {
    await db.run("INSERT INTO customers (id, store_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)", [payload.id, session.storeId, payload.name, payload.phone, payload.email, payload.address]);
    await queueOperation(db, session.storeId, "CUSTOMER_CREATE", payload.id, payload); return payload.id;
  });
  router.secure("customers:update", "customers:manage", (payload) => { assertExactKeys(payload, ["id", "customer"]); return { id: id(payload.id), customer: validateCustomer({ ...payload.customer, id: payload.id }) }; }, async ({ payload, session }) => {
    const prior = await db.get("SELECT * FROM customers WHERE id=? AND store_id=?", [payload.id, session.storeId]);
    await db.run("UPDATE customers SET name=?,phone=?,email=?,address=? WHERE id=? AND store_id=?", [payload.customer.name, payload.customer.phone, payload.customer.email, payload.customer.address, payload.id, session.storeId]);
    await queueOperation(db, session.storeId, "CUSTOMER_UPDATE", payload.id, payload.customer, prior); return { success: true };
  });
  router.secure("customers:delete", "customers:manage", (payload) => { assertExactKeys(payload, ["id"]); return { id: id(payload.id) }; }, async ({ payload, session }) => {
    const prior = await db.get("SELECT * FROM customers WHERE id=? AND store_id=?", [payload.id, session.storeId]);
    await db.run("DELETE FROM customers WHERE id=? AND store_id=?", [payload.id, session.storeId]); await queueOperation(db, session.storeId, "CUSTOMER_DELETE", payload.id, { id: payload.id }, prior); return { success: true };
  });

  router.secure("brands:list", "inventory:manage", emptyPayload, ({ session }) => db.all("SELECT * FROM brands WHERE store_id=? ORDER BY name", [session.storeId]));
  router.secure("brands:listWithCounts", "inventory:manage", emptyPayload, ({ session }) => db.all("SELECT b.id,b.name,COUNT(p.id) AS productCount FROM brands b LEFT JOIN products p ON b.id=p.brand_id AND p.store_id=b.store_id WHERE b.store_id=? GROUP BY b.id,b.name ORDER BY b.name", [session.storeId]));
  router.secure("brands:create", "inventory:manage", (payload) => { assertExactKeys(payload, ["name", "description"]); return { name: readString(payload.name, "name", { min: 1, max: 160 }), description: optionalString(payload.description, "description") }; }, async ({ payload, session }) => {
    const brandId = crypto.randomUUID(); await db.run("INSERT INTO brands (id,store_id,name,description) VALUES (?,?,?,?)", [brandId, session.storeId, payload.name, payload.description]); await queueOperation(db, session.storeId, "BRAND_UPSERT", brandId, { id: brandId, ...payload }); return brandId;
  });
  router.secure("brands:update", "inventory:manage", (payload) => { assertExactKeys(payload, ["id", "name", "description"]); return { id: id(payload.id), name: readString(payload.name, "name", { min: 1, max: 160 }), description: optionalString(payload.description, "description") }; }, async ({ payload, session }) => {
    const prior = await db.get("SELECT * FROM brands WHERE id=? AND store_id=?", [payload.id, session.storeId]); await db.run("UPDATE brands SET name=?,description=? WHERE id=? AND store_id=?", [payload.name, payload.description, payload.id, session.storeId]); await queueOperation(db, session.storeId, "BRAND_UPSERT", payload.id, payload, prior); return { success: true };
  });
  router.secure("brands:delete", "product:delete", (payload) => { assertExactKeys(payload, ["id"]); return { id: id(payload.id) }; }, async ({ payload, session }) => {
    const prior = await db.get("SELECT * FROM brands WHERE id=? AND store_id=?", [payload.id, session.storeId]); await db.run("DELETE FROM brands WHERE id=? AND store_id=?", [payload.id, session.storeId]); await queueOperation(db, session.storeId, "BRAND_DELETE", payload.id, { id: payload.id }, prior); return { success: true };
  });

  router.secure("orders:list", "sales:view", (payload) => {
    assertExactKeys(payload || {}, ["search", "status", "startDate", "endDate", "limit", "offset"]);
    const dates = validateDateRange({ startDate: payload?.startDate, endDate: payload?.endDate });
    return { search: readString(payload?.search || "", "search", { max: 160 }), status: readEnum(payload?.status || "all", "status", ORDER_STATUSES), ...dates, limit: readNumber(payload?.limit ?? 50, "limit", { integer: true, min: 1, max: 200 }), offset: readNumber(payload?.offset ?? 0, "offset", { integer: true, min: 0, max: 1_000_000 }) };
  }, async ({ payload, session }) => {
    let sql = "SELECT o.*,COUNT(oi.id) AS itemCount FROM orders o LEFT JOIN order_items oi ON o.id=oi.order_id WHERE o.store_id=?"; const params = [session.storeId];
    if (payload.search) { sql += " AND (o.id LIKE ? OR o.customer_name LIKE ?)"; params.push(`%${payload.search}%`, `%${payload.search}%`); }
    if (payload.status !== "all") { sql += " AND o.status=?"; params.push(payload.status); }
    if (payload.startDate) { sql += " AND o.created_at BETWEEN ? AND ?"; params.push(payload.startDate, payload.endDate); }
    params.push(payload.limit, payload.offset); return db.all(`${sql} GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`, params);
  });
  router.secure("orders:getDetails", "sales:view", (payload) => { assertExactKeys(payload, ["orderId"]); return { orderId: id(payload.orderId, "orderId") }; }, async ({ payload, session }) => {
    const order = await db.get("SELECT o.id,o.customer_name AS customerName,o.total,o.status,o.created_at AS createdAt,o.subtotal,o.discount,o.tax,o.payment_method AS paymentMethod,o.store_credit_used AS storeCreditUsed,o.original_order_id AS originalOrderId,o.returned_items_json AS returnedItemsJson FROM orders o WHERE o.id=? AND o.store_id=?", [payload.orderId, session.storeId]);
    if (!order) return null;
    const items = await db.all("SELECT oi.id,oi.product_id AS productId,COALESCE(oi.name,p.name,'Unknown Item') AS name,oi.price,oi.quantity,oi.total,oi.unit,oi.price_type AS priceType,p.sku FROM order_items oi LEFT JOIN products p ON oi.product_id=p.id WHERE oi.order_id=? AND oi.store_id=?", [payload.orderId, session.storeId]);
    let returnedItems; try { returnedItems = order.returnedItemsJson ? JSON.parse(order.returnedItemsJson) : undefined; } catch { returnedItems = undefined; }
    return { ...order, items, returnedItems };
  });
  router.secure("orders:getReturns", "sales:view", (payload) => { assertExactKeys(payload, ["orderId"]); return { orderId: id(payload.orderId, "orderId") }; }, ({ payload, session }) => db.all("SELECT * FROM returns WHERE order_id=? AND store_id=? ORDER BY created_at DESC", [payload.orderId, session.storeId]));
  router.secure("orders:create", "pos:use", (payload) => {
    assertExactKeys(payload, ["id", "customer_id", "customer_name", "subtotal", "discount", "tax", "total", "payment_method", "store_credit_used", "status", "original_order_id", "returned_items_json", "items"]);
    return {
      id: payload.id ? id(payload.id) : crypto.randomUUID(), customer_id: payload.customer_id ? id(payload.customer_id, "customer_id") : null, customer_name: optionalString(payload.customer_name, "customer_name", 160),
      subtotal: readNumber(payload.subtotal ?? 0, "subtotal", { min: 0 }), discount: readNumber(payload.discount ?? 0, "discount", { min: 0 }), tax: readNumber(payload.tax ?? 0, "tax", { min: 0 }), total: readNumber(payload.total ?? 0, "total", { min: 0 }),
      payment_method: readEnum(payload.payment_method || "cash", "payment_method", ["cash", "card", "bank", "credit", "mixed", "upi", "exchange"]), store_credit_used: readNumber(payload.store_credit_used ?? 0, "store_credit_used", { min: 0 }), status: readEnum(payload.status || "completed", "status", ["completed", "pending"]),
      original_order_id: payload.original_order_id ? id(payload.original_order_id, "original_order_id") : null, returned_items_json: optionalString(payload.returned_items_json, "returned_items_json", 100_000), items: readArray(payload.items, "items", { min: 1, max: 500 }).map(validateOrderItem),
    };
  }, async ({ payload, session }) => {
    const orderData = { ...payload, store_id: session.storeId, staff_id: session.id, items: payload.items.map((item) => ({ ...item, product_id: item.productId, price_type: item.priceType })) };
    const result = await createOrder(db, orderData); await queueOperation(db, session.storeId, "ORDER_CREATE", result.id, { ...orderData, id: result.id }); return result;
  });
  router.secure("returns:create", "returns:process", (payload) => {
    assertExactKeys(payload, ["orderId", "value", "items", "status"]);
    return { orderId: id(payload.orderId, "orderId"), value: readNumber(payload.value, "value", { min: 0 }), status: readEnum(payload.status || "completed", "status", ["completed"]), items: readArray(payload.items, "items", { min: 1, max: 500 }).map(validateOrderItem) };
  }, async ({ payload, session }) => {
    const returnId = crypto.randomUUID(); const result = await recordReturn(db, { ...payload, id: returnId, storeId: session.storeId });
    await queueOperation(db, session.storeId, "ORDER_RETURN", returnId, { id: returnId, order_id: payload.orderId, return_value: result.value, items: payload.items, status: payload.status });
    for (const inventoryLog of result.inventoryLogs || []) await queueOperation(db, session.storeId, "INVENTORY_ADJUST", inventoryLog.id, inventoryLog);
    await queueOperation(db, session.storeId, "ORDER_UPDATE", payload.orderId, { id: payload.orderId, status: "returned" }); return result;
  });
  router.secure("exchanges:finalize", "returns:process", (payload) => {
    assertExactKeys(payload, ["replacementOrderId", "originalOrderId", "customerId", "customerName", "returnedItems", "returnCredit", "replacementItems", "paymentMethod", "storeCreditUsed", "staffId", "balanceOutcome"]);
    return { replacementOrderId: payload.replacementOrderId ? id(payload.replacementOrderId, "replacementOrderId") : crypto.randomUUID(), originalOrderId: id(payload.originalOrderId, "originalOrderId"), customerId: payload.customerId ? id(payload.customerId, "customerId") : null, customerName: optionalString(payload.customerName, "customerName", 160), returnedItems: readArray(payload.returnedItems, "returnedItems", { min: 1, max: 500 }).map(validateOrderItem), replacementItems: readArray(payload.replacementItems, "replacementItems", { min: 1, max: 500 }).map(validateOrderItem), paymentMethod: readEnum(payload.paymentMethod || "cash", "paymentMethod", ["cash", "card", "bank", "credit", "mixed", "upi", "exchange"]), balanceOutcome: readEnum(payload.balanceOutcome || "none", "balanceOutcome", ["none", "cash_refund", "store_credit", "extra_paid"]) };
  }, async ({ payload, session }) => {
    const result = await finalizeExchange(db, { ...payload, storeId: session.storeId, staffId: session.id, returnedItems: payload.returnedItems.map((item) => ({ ...item, productId: item.productId })), replacementItems: payload.replacementItems.map((item) => ({ ...item, productId: item.productId, priceType: item.priceType })) });
    if (result.success) { await queueOperation(db, session.storeId, "ORDER_RETURN", result.returnId, { ...result, order_id: payload.originalOrderId }); await queueOperation(db, session.storeId, "ORDER_CREATE", result.replacementOrderId, { ...payload, id: result.replacementOrderId }); for (const inventoryLog of result.inventoryLogs || []) await queueOperation(db, session.storeId, "INVENTORY_ADJUST", inventoryLog.id, inventoryLog); }
    return result;
  });

  router.secure("inventory:adjustStock", "inventory:manage", (payload) => { assertExactKeys(payload, ["productId", "adjustment", "reason"]); return { productId: id(payload.productId, "productId"), adjustment: readNumber(payload.adjustment, "adjustment", { min: -1_000_000, max: 1_000_000 }), reason: optionalString(payload.reason, "reason", 500) }; }, async ({ payload, session }) => {
    const product = await db.get("SELECT stock FROM products WHERE id=? AND store_id=?", [payload.productId, session.storeId]); if (!product) throw new Error("Product not found");
    const previousStock = Number(product.stock || 0); const newStock = Math.max(0, previousStock + payload.adjustment); const logId = crypto.randomUUID();
    await db.transaction([{ sql: "UPDATE products SET stock=? WHERE id=? AND store_id=?", params: [newStock, payload.productId, session.storeId] }, { sql: "INSERT INTO inventory_logs (id,store_id,product_id,action_type,quantity,previous_stock,current_stock,reason,staff_id) VALUES (?,?,?,?,?,?,?,?,?)", params: [logId, session.storeId, payload.productId, payload.adjustment >= 0 ? "STOCK_IN" : "STOCK_OUT", Math.abs(payload.adjustment), previousStock, newStock, payload.reason, session.id] }]);
    await queueOperation(db, session.storeId, "INVENTORY_ADJUST", logId, { id: logId, product_id: payload.productId, quantity: payload.adjustment, previous_stock: previousStock, current_stock: newStock, reason: payload.reason, staff_id: session.id }); return { success: true, previousStock, newStock, logId };
  });

  router.secure("reports:getDashboardStats", "reports:view", validateDateRange, async ({ payload, session }) => {
    const filter = payload.startDate ? "AND created_at BETWEEN ? AND ?" : ""; const params = payload.startDate ? [payload.startDate, payload.endDate] : [];
    const [revenue, orders, products, customers] = await Promise.all([db.get(`SELECT COALESCE(SUM(total),0) total FROM orders WHERE store_id=? ${filter}`, [session.storeId, ...params]), db.get(`SELECT COUNT(*) count FROM orders WHERE store_id=? ${filter}`, [session.storeId, ...params]), db.get("SELECT COUNT(*) count FROM products WHERE store_id=?", [session.storeId]), db.get("SELECT COUNT(*) count FROM customers WHERE store_id=?", [session.storeId])]);
    return { totalRevenue: revenue?.total || 0, totalOrders: orders?.count || 0, activeProducts: products?.count || 0, totalCustomers: customers?.count || 0 };
  });
  router.secure("reports:getSalesTrend", "reports:view", validateDateRange, ({ payload, session }) => { const filter = payload.startDate ? "AND created_at BETWEEN ? AND ?" : ""; const params = payload.startDate ? [payload.startDate, payload.endDate] : []; return db.all(`SELECT strftime('%Y-%m-%d',created_at) date,SUM(total) sales,COUNT(id) orders FROM orders WHERE store_id=? ${filter} GROUP BY date ORDER BY date`, [session.storeId, ...params]); });
  router.secure("reports:getSalesByBrand", "reports:view", validateDateRange, ({ payload, session }) => { const filter = payload.startDate ? "AND o.created_at BETWEEN ? AND ?" : ""; const params = payload.startDate ? [payload.startDate, payload.endDate] : []; return db.all(`SELECT COALESCE(b.name,'Unbranded') brandName,COUNT(DISTINCT o.id) orderCount,COALESCE(SUM(oi.total),0) revenue FROM order_items oi JOIN orders o ON oi.order_id=o.id LEFT JOIN products p ON oi.product_id=p.id LEFT JOIN brands b ON p.brand_id=b.id WHERE o.store_id=? ${filter} GROUP BY b.id,b.name ORDER BY revenue DESC`, [session.storeId, ...params]); });
  router.secure("reports:getTopProducts", "reports:view", (payload) => { const dates = validateDateRange(payload || {}, ["limit"]); return { ...dates, limit: readNumber(payload?.limit ?? 10, "limit", { integer: true, min: 1, max: 100 }) }; }, ({ payload, session }) => { const filter = payload.startDate ? "AND o.created_at BETWEEN ? AND ?" : ""; const params = payload.startDate ? [payload.startDate, payload.endDate] : []; return db.all(`SELECT oi.name productName,SUM(oi.quantity) totalSold,SUM(oi.total) revenue FROM order_items oi JOIN orders o ON oi.order_id=o.id WHERE o.store_id=? ${filter} GROUP BY oi.product_id,oi.name ORDER BY totalSold DESC LIMIT ?`, [session.storeId, ...params, payload.limit]); });
  router.secure("reports:getSalesSummary", "reports:view", validateDateRange, ({ payload, session }) => { const filter = payload.startDate ? "AND created_at BETWEEN ? AND ?" : ""; const params = payload.startDate ? [payload.startDate, payload.endDate] : []; return db.get(`SELECT COALESCE(SUM(total),0) totalRevenue,COUNT(*) totalOrders,COALESCE(SUM(discount),0) totalDiscount,COALESCE(SUM(tax),0) totalTax,COALESCE(AVG(total),0) avgOrderValue,COALESCE(SUM(CASE WHEN payment_method='cash' THEN total ELSE 0 END),0) cashSales,COALESCE(SUM(CASE WHEN payment_method='card' THEN total ELSE 0 END),0) cardSales,COALESCE(SUM(CASE WHEN payment_method='bank' THEN total ELSE 0 END),0) bankSales FROM orders WHERE store_id=? ${filter}`, [session.storeId, ...params]); });
  router.secure("reports:getStaffSales", "reports:view", validateDateRange, ({ payload, session }) => { const filter = payload.startDate ? "AND o.created_at BETWEEN ? AND ?" : ""; const params = payload.startDate ? [payload.startDate, payload.endDate] : []; return db.all(`SELECT COALESCE(s.name,'Unknown') staffName,COUNT(o.id) orderCount,COALESCE(SUM(o.total),0) revenue FROM orders o LEFT JOIN staff s ON o.staff_id=s.id WHERE o.store_id=? ${filter} GROUP BY o.staff_id,s.name ORDER BY revenue DESC`, [session.storeId, ...params]); });
  router.secure("activity:list", "reports:view", (payload) => { assertExactKeys(payload || {}, ["limit", "offset"]); return { limit: readNumber(payload?.limit ?? 100, "limit", { integer: true, min: 1, max: 500 }), offset: readNumber(payload?.offset ?? 0, "offset", { integer: true, min: 0 }) }; }, ({ payload, session }) => db.all(`SELECT * FROM (SELECT l.id,s.name user,l.action,'System' target,l.created_at timestamp,'auth' type FROM login_logs l LEFT JOIN staff s ON l.staff_id=s.id WHERE s.store_id=? OR s.store_id='default' UNION ALL SELECT o.id,COALESCE(s.name,'Unknown') user,'Order #'||SUBSTR(o.id,1,8) action,o.customer_name target,o.created_at timestamp,'order' type FROM orders o LEFT JOIN staff s ON o.staff_id=s.id WHERE o.store_id=? UNION ALL SELECT il.id,COALESCE(s.name,'System') user,il.action_type||' ('||il.quantity||')' action,p.name target,il.created_at timestamp,'stock' type FROM inventory_logs il LEFT JOIN staff s ON il.staff_id=s.id LEFT JOIN products p ON il.product_id=p.id WHERE il.store_id=?) ORDER BY timestamp DESC LIMIT ? OFFSET ?`, [session.storeId, session.storeId, session.storeId, payload.limit, payload.offset]));
  router.secure("activity:count", "reports:view", emptyPayload, async ({ session }) => { const row = await db.get("SELECT (SELECT COUNT(*) FROM login_logs l LEFT JOIN staff s ON l.staff_id=s.id WHERE s.store_id=? OR s.store_id='default')+(SELECT COUNT(*) FROM orders WHERE store_id=?)+(SELECT COUNT(*) FROM inventory_logs WHERE store_id=?) count", [session.storeId, session.storeId, session.storeId]); return row?.count || 0; });

  router.secure("procurement:listSuppliers", "procurement:manage", emptyPayload, ({ session }) => db.all("SELECT * FROM suppliers WHERE store_id=? ORDER BY name", [session.storeId]));
  router.secure("procurement:upsertSupplier", "procurement:manage", (payload) => { assertExactKeys(payload, ["id", "name", "contactPerson", "phone", "email", "address"]); return { id: payload.id ? id(payload.id) : crypto.randomUUID(), name: readString(payload.name, "name", { min: 1, max: 160 }), contactPerson: optionalString(payload.contactPerson, "contactPerson", 160), phone: optionalString(payload.phone, "phone", 64), email: optionalString(payload.email, "email", 254), address: optionalString(payload.address, "address", 1_000) }; }, async ({ payload, session }) => { const prior = await db.get("SELECT * FROM suppliers WHERE id=? AND store_id=?", [payload.id, session.storeId]); await db.run("INSERT INTO suppliers (id,store_id,name,contact_person,phone,email,address) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,contact_person=excluded.contact_person,phone=excluded.phone,email=excluded.email,address=excluded.address,version=version+1", [payload.id, session.storeId, payload.name, payload.contactPerson, payload.phone, payload.email, payload.address]); await queueOperation(db, session.storeId, "SUPPLIER_UPSERT", payload.id, payload, prior); return { success: true, id: payload.id }; });
  router.secure("procurement:listOrders", "procurement:manage", emptyPayload, ({ session }) => db.all("SELECT po.*,s.name supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id WHERE po.store_id=? ORDER BY po.created_at DESC", [session.storeId]));
  router.secure("procurement:getItems", "procurement:manage", (payload) => { assertExactKeys(payload, ["purchaseOrderId"]); return { purchaseOrderId: id(payload.purchaseOrderId, "purchaseOrderId") }; }, ({ payload, session }) => db.all("SELECT * FROM purchase_order_items WHERE purchase_order_id=? AND store_id=?", [payload.purchaseOrderId, session.storeId]));
  router.secure("procurement:saveOrder", "procurement:manage", (payload) => {
    assertExactKeys(payload, ["id", "supplierId", "referenceNumber", "notes", "items"]); const poId = payload.id ? id(payload.id) : crypto.randomUUID(); const items = readArray(payload.items, "items", { min: 1, max: 500 }).map((item, index) => { assertExactKeys(item, ["productId", "name", "sku", "costPrice", "quantity", "totalCost"], `items[${index}]`); return { productId: item.productId ? id(item.productId, `items[${index}].productId`) : null, name: readString(item.name, `items[${index}].name`, { min: 1, max: 160 }), sku: optionalString(item.sku, `items[${index}].sku`, 80), costPrice: readNumber(item.costPrice, `items[${index}].costPrice`, { min: 0 }), quantity: readNumber(item.quantity, `items[${index}].quantity`, { min: 0.000001 }), totalCost: readNumber(item.totalCost, `items[${index}].totalCost`, { min: 0 }) }; }); return { id: poId, supplierId: id(payload.supplierId, "supplierId"), referenceNumber: optionalString(payload.referenceNumber, "referenceNumber", 160), notes: optionalString(payload.notes, "notes", 2_000), items };
  }, async ({ payload, session }) => { const totalAmount = payload.items.reduce((sum, item) => sum + item.totalCost, 0); const prior = await db.get("SELECT * FROM purchase_orders WHERE id=? AND store_id=?", [payload.id, session.storeId]); const ops = [{ sql: "INSERT INTO purchase_orders (id,store_id,supplier_id,reference_number,notes,total_amount) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET supplier_id=excluded.supplier_id,reference_number=excluded.reference_number,notes=excluded.notes,total_amount=excluded.total_amount,version=version+1", params: [payload.id, session.storeId, payload.supplierId, payload.referenceNumber, payload.notes, totalAmount] }, { sql: "DELETE FROM purchase_order_items WHERE purchase_order_id=? AND store_id=?", params: [payload.id, session.storeId] }, ...payload.items.map((item) => ({ sql: "INSERT INTO purchase_order_items (id,store_id,purchase_order_id,product_id,name,sku,cost_price,quantity,total_cost) VALUES (?,?,?,?,?,?,?,?,?)", params: [crypto.randomUUID(), session.storeId, payload.id, item.productId, item.name, item.sku, item.costPrice, item.quantity, item.totalCost] }))]; await db.transaction(ops); await queueOperation(db, session.storeId, prior ? "PO_UPDATE" : "PO_CREATE", payload.id, { ...payload, total_amount: totalAmount }, prior); return { success: true, id: payload.id }; });
  router.secure("procurement:receiveOrder", "procurement:manage", (payload) => { assertExactKeys(payload, ["id"]); return { id: id(payload.id) }; }, async ({ payload, session }) => { const po = await db.get("SELECT id,reference_number,status FROM purchase_orders WHERE id=? AND store_id=?", [payload.id, session.storeId]); if (!po) throw new Error("Purchase order not found"); if (po.status !== "pending") throw new Error("Only pending purchase orders can be received"); const items = await db.all("SELECT * FROM purchase_order_items WHERE purchase_order_id=? AND store_id=?", [payload.id, session.storeId]); const now = new Date().toISOString(); const ops = []; for (const item of items) { if (!item.product_id) continue; const product = await db.get("SELECT stock FROM products WHERE id=? AND store_id=?", [item.product_id, session.storeId]); if (!product) continue; const newStock = Number(product.stock || 0) + Number(item.quantity || 0); ops.push({ sql: "UPDATE products SET stock=? WHERE id=? AND store_id=?", params: [newStock, item.product_id, session.storeId] }, { sql: "INSERT INTO inventory_logs (id,store_id,product_id,action_type,quantity,previous_stock,current_stock,reason,staff_id) VALUES (?,?,?,?,?,?,?,?,?)", params: [crypto.randomUUID(), session.storeId, item.product_id, "STOCK_IN", item.quantity, product.stock, newStock, `Received from PO #${po.reference_number || po.id.slice(0, 8)}`, session.id] }); } ops.push({ sql: "UPDATE purchase_orders SET status='received',received_at=? WHERE id=? AND store_id=?", params: [now, payload.id, session.storeId] }); await db.transaction(ops); await queueOperation(db, session.storeId, "PO_UPDATE", payload.id, { id: payload.id, status: "received", received_at: now }); return { success: true }; });

  router.secure("staff:list", "staff:manage", emptyPayload, ({ session }) => db.all("SELECT id,name,role,status,created_at FROM staff WHERE store_id=? OR store_id='default' ORDER BY name", [session.storeId]));
  router.secure("staff:create", "staff:manage", (payload) => { assertExactKeys(payload, ["name", "pin", "role"]); return { name: readString(payload.name, "name", { min: 2, max: 80 }), pin: validatePin(payload.pin), role: readEnum(payload.role, "role", STAFF_ROLES) }; }, async ({ payload, session }) => { const rows = await db.all("SELECT pin,pin_hash FROM staff WHERE store_id=? OR store_id='default'", [session.storeId]); if (rows.some((row) => verifyPin(payload.pin, row.pin_hash) || (!row.pin_hash && row.pin === payload.pin))) return { success: false, error: "A staff member with this PIN already exists." }; const staffId = crypto.randomUUID(); await db.run("INSERT INTO staff (id,store_id,name,pin,pin_hash,role,status,requires_pin_setup) VALUES (?,?,?,'',?,?,'active',0)", [staffId, session.storeId, payload.name, hashPin(payload.pin), payload.role]); return { success: true, id: staffId }; });
  router.secure("staff:update", "staff:manage", (payload) => { assertExactKeys(payload, ["id", "name", "pin", "role", "status"]); return { id: id(payload.id), name: readString(payload.name, "name", { min: 2, max: 80 }), pin: payload.pin ? validatePin(payload.pin) : null, role: readEnum(payload.role, "role", STAFF_ROLES), status: readEnum(payload.status, "status", STAFF_STATUSES) }; }, async ({ payload, session }) => { if (payload.id === session.id && (payload.status !== "active" || !["owner", "admin"].includes(payload.role))) return { success: false, error: "You cannot remove your own administrative access." }; if (payload.pin) { const rows = await db.all("SELECT id,pin,pin_hash FROM staff WHERE id!=? AND (store_id=? OR store_id='default')", [payload.id, session.storeId]); if (rows.some((row) => verifyPin(payload.pin, row.pin_hash) || (!row.pin_hash && row.pin === payload.pin))) return { success: false, error: "Another staff member already uses this PIN." }; await db.run("UPDATE staff SET name=?,role=?,status=?,pin='',pin_hash=? WHERE id=? AND (store_id=? OR store_id='default')", [payload.name, payload.role, payload.status, hashPin(payload.pin), payload.id, session.storeId]); } else await db.run("UPDATE staff SET name=?,role=?,status=? WHERE id=? AND (store_id=? OR store_id='default')", [payload.name, payload.role, payload.status, payload.id, session.storeId]); return { success: true }; });
  router.secure("staff:delete", "staff:manage", (payload) => { assertExactKeys(payload, ["id"]); return { id: id(payload.id) }; }, async ({ payload, session }) => { if (payload.id === session.id) return { success: false, error: "You cannot delete your own account." }; await db.run("DELETE FROM staff WHERE id=? AND (store_id=? OR store_id='default')", [payload.id, session.storeId]); return { success: true }; });

  router.secure("database:clear", "database:manage", (payload) => { assertExactKeys(payload, ["type"]); return { type: readEnum(payload.type, "type", CLEAR_TYPES) }; }, ({ payload, session }) => clearData(db, payload.type, session.storeId));
  router.secure("database:backup", "database:manage", emptyPayload, async () => { const result = await dialog.showSaveDialog({ title: "Backup Database", defaultPath: `inventoriman_backup_${new Date().toISOString().slice(0, 10)}.db`, filters: [{ name: "SQLite Database", extensions: ["db"] }] }); if (result.canceled || !result.filePath) return { success: false }; await db.backup(result.filePath); return { success: true, path: result.filePath }; });
  router.secure("database:restore", "database:manage", emptyPayload, async () => { const result = await dialog.showOpenDialog({ title: "Restore Database", filters: [{ name: "SQLite Database", extensions: ["db"] }], properties: ["openFile"] }); if (result.canceled || result.filePaths.length !== 1) return { success: false }; const choice = dialog.showMessageBoxSync({ type: "warning", buttons: ["Cancel", "Restore and Restart"], defaultId: 0, title: "Confirm Restore", message: "Restoring will overwrite the current database and restart the application. All unsynced changes will be lost." }); if (choice !== 1) return { success: false }; await db.close(); fs.copyFileSync(result.filePaths[0], path.join(app.getPath("userData"), "inventoriman.db")); app.relaunch(); app.exit(0); return { success: true }; });

  router.public("license:getStatus", emptyPayload, () => getLicenseStatus());
  router.secure("license:activate", "license:manage", (payload) => { assertExactKeys(payload, ["key"]); return { key: readString(payload.key, "key", { min: 4, max: 256 }) }; }, async ({ payload }) => { const result = await activateLicense(payload.key); if (result.success) log.info("License activated"); else log.warn("License activation failed:", result.error); return result; });
  router.secure("system:getInfo", "settings:view", emptyPayload, () => ({ appVersion: app.getVersion(), electronVersion: process.versions.electron, nodeVersion: process.versions.node, platform: `${os.type()} ${os.release()}`, arch: os.arch(), logFilePath: getLogFilePath(), userDataPath: app.getPath("userData") }));
  router.secure("system:openLogFile", "settings:view", emptyPayload, () => shell.openPath(getLogFilePath()));
  router.secure("update:install", "system:update", emptyPayload, () => { if (app.isPackaged) require("./updater.cjs").installUpdate(); });

  const sync = () => { const manager = getSyncManager(); if (!manager) throw new Error("Sync manager is not ready"); return manager; };
  router.secure("sync:getStatus", "session:use", emptyPayload, () => sync().getPendingCount());
  router.secure("sync:trigger", "session:use", emptyPayload, () => sync().processQueue());
  router.secure("sync:getSettings", "sync:manage", emptyPayload, () => sync().getSettings());
  router.secure("sync:saveSettings", "sync:manage", (payload) => { assertExactKeys(payload, ["url", "key"]); return { url: readString(payload.url, "url", { min: 1, max: 2_048 }), key: readString(payload.key || "", "key", { max: 4_096 }) }; }, ({ payload }) => sync().saveSyncSettings(payload));
  router.secure("sync:testConnection", "sync:manage", emptyPayload, () => sync().testConnection());
  router.secure("sync:getConflicts", "sync:manage", emptyPayload, () => sync().getConflicts());
  router.secure("sync:resolveConflict", "sync:manage", (payload) => { assertExactKeys(payload, ["syncItemId", "resolution", "resolvedData"]); assertPlainObject(payload.resolvedData || {}, "resolvedData"); return { syncItemId: id(payload.syncItemId, "syncItemId"), resolution: readEnum(payload.resolution, "resolution", ["local", "remote", "manual"]), resolvedData: payload.resolvedData || {} }; }, ({ payload }) => sync().resolveConflict(payload.syncItemId, payload.resolution, payload.resolvedData));
  router.secure("sync:autoResolveAllConflicts", "sync:manage", emptyPayload, () => sync().autoResolveAllConflicts());
  router.secure("cloud:signIn", "sync:manage", (payload) => { assertExactKeys(payload, ["url", "key", "email", "password", "storeId"]); const email = readString(payload.email, "email", { min: 3, max: 254 }); const password = typeof payload.password === "string" && payload.password.length >= 1 && payload.password.length <= 512 ? payload.password : null; if (!password) throw new SecurityError("INVALID_PAYLOAD", "password is required"); return { url: payload.url ? readString(payload.url, "url", { max: 2_048 }) : undefined, key: payload.key ? readString(payload.key, "key", { max: 4_096 }) : undefined, email, password, storeId: payload.storeId ? id(payload.storeId, "storeId") : undefined }; }, async ({ event, payload }) => { const result = await sync().signIn(payload); if (result.success && result.storeId) await sessionManager.updateStoreId(event.sender.id, result.storeId); return result; });
  router.secure("cloud:signOut", "sync:manage", emptyPayload, () => sync().signOut());
  router.secure("cloud:getSession", "sync:manage", emptyPayload, () => sync().getSession());
}

module.exports = { registerApplicationIpc };
