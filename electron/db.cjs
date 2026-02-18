const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");
const { v4: uuidv4 } = require("uuid");

// Database file path: Stored in user data directory
const dbPath = path.join(app.getPath("userData"), "inventoriman.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

/**
 * Initialize Tables
 */
function initDb() {
  console.log("DB: Initializing database...");
  // Temporarily disable foreign keys for migration
  db.pragma("foreign_keys = OFF");

  db.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      logo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT UNIQUE,
      brand_id TEXT,
      price REAL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      image TEXT,
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      customer_name TEXT,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL DEFAULT 0,
      payment_method TEXT,
      store_credit_used REAL DEFAULT 0,
      status TEXT DEFAULT 'completed',
      staff_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      price_type TEXT DEFAULT 'retail',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_logs (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      action_type TEXT NOT NULL, -- 'sale', 'return', 'adjustment', 'transfer'
      quantity INTEGER NOT NULL,
      previous_stock INTEGER,
      current_stock INTEGER,
      reason TEXT,
      staff_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_json TEXT,
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SYNCED', 'FAILED'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pin TEXT NOT NULL, -- Numeric PIN for quick POS access
      role TEXT DEFAULT 'cashier', -- 'owner', 'admin', 'manager', 'cashier'
      permissions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_logs (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      action TEXT NOT NULL, -- 'login', 'logout'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE CASCADE
    );
  `);

  // Migrate existing categories to brands if categories table exists
  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").get();
    if (tableExists) {
      console.log("Migrating categories to brands...");

      // Copy categories to brands
      db.prepare(
        `
        INSERT OR IGNORE INTO brands (id, name, created_at)
        SELECT id, name, created_at FROM categories
      `,
      ).run();

      // Update products to use brand_id (if old schema exists)
      const productsInfo = db.prepare("PRAGMA table_info(products)").all();
      const hasCategoryId = productsInfo.some((col) => col.name === "category_id");
      const hasBrandId = productsInfo.some((col) => col.name === "brand_id");

      if (hasCategoryId && !hasBrandId) {
        console.log("Converting products from category_id to brand_id...");
        // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
        db.exec(`
          -- Create temporary table with new schema
          CREATE TABLE products_temp (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            sku TEXT UNIQUE,
            brand_id TEXT,
            price REAL DEFAULT 0,
            wholesale_price REAL DEFAULT 0,
            cost_price REAL DEFAULT 0,
            image TEXT,
            stock INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE SET NULL
          );

          -- Copy data (category_id becomes brand_id)
          INSERT INTO products_temp (id, name, description, sku, brand_id, price, wholesale_price, cost_price, image, stock, created_at)
          SELECT id, name, description, sku, category_id, price, wholesale_price, cost_price, image, stock, created_at FROM products;

          -- Drop old table
          DROP TABLE products;

          -- Rename temp table
          ALTER TABLE products_temp RENAME TO products;
        `);
        console.log("✓ Products table migrated");
      } else if (hasCategoryId && hasBrandId) {
        // Both columns exist, copy category_id to brand_id if brand_id is null
        console.log("Syncing category_id to brand_id...");
        db.exec(`UPDATE products SET brand_id = category_id WHERE brand_id IS NULL`);
      }

      // Recreate order_items with proper foreign keys
      const orderItemsInfo = db.prepare("PRAGMA table_info(order_items)").all();
      const orderItemsHasProperFK = db
        .prepare(
          `
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name='order_items' AND sql LIKE '%ON DELETE%'
      `,
        )
        .get();

      if (!orderItemsHasProperFK) {
        console.log("Updating order_items foreign keys...");
        db.exec(`
          CREATE TABLE order_items_temp (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            product_id TEXT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            total REAL NOT NULL,
            price_type TEXT DEFAULT 'retail',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
          );

          INSERT INTO order_items_temp SELECT * FROM order_items;
          DROP TABLE order_items;
          ALTER TABLE order_items_temp RENAME TO order_items;
        `);
        console.log("✓ Order_items foreign keys updated");
      }

      // Drop categories table
      db.exec("DROP TABLE IF EXISTS categories");
      console.log("Migration complete: categories → brands");
    }
  } catch (err) {
    console.log("Migration info:", err.message);
  }

  // Re-enable foreign keys
  db.pragma("foreign_keys = ON");

  // Clean up any invalid brand_id references
  try {
    const invalidProducts = db
      .prepare(
        `
      SELECT p.id, p.name, p.brand_id 
      FROM products p 
      LEFT JOIN brands b ON p.brand_id = b.id 
      WHERE p.brand_id IS NOT NULL AND b.id IS NULL
    `,
      )
      .all();

    if (invalidProducts.length > 0) {
      console.log(`Cleaning up ${invalidProducts.length} products with invalid brand references...`);
      db.prepare("UPDATE products SET brand_id = NULL WHERE brand_id NOT IN (SELECT id FROM brands)").run();
      console.log("✓ Invalid brand references cleaned");
    }
  } catch (err) {
    console.log("Brand cleanup check:", err.message);
  }

  // Add unit column to products table if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    const hasUnitColumn = tableInfo.some((col) => col.name === "unit");

    if (!hasUnitColumn) {
      console.log("Adding unit column to products table...");
      db.exec("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'item'");
      console.log("✓ Unit column added to products table");
    }
  } catch (err) {
    console.log("Unit column migration:", err.message);
  }

  // Add staff_id column to orders table if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
    const hasStaffIdColumn = tableInfo.some((col) => col.name === "staff_id");

    if (!hasStaffIdColumn) {
      console.log("Adding staff_id column to orders table...");
      db.exec("ALTER TABLE orders ADD COLUMN staff_id TEXT");
      console.log("✓ Staff_id column added to orders table");
    }
  } catch (err) {
    console.log("Staff_id column migration:", err.message);
  }

  // Fix login_logs schema: Ensure created_at exists (migrate from timestamp if needed)
  // Fix login_logs schema: Ensure created_at exists (migrate from timestamp if needed)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(login_logs)").all();
    const columnNames = tableInfo.map((col) => col.name);

    if (!columnNames.includes("created_at")) {
      if (columnNames.includes("timestamp")) {
        console.log("Migrating login_logs: Renaming timestamp to created_at...");
        db.exec("ALTER TABLE login_logs RENAME COLUMN timestamp TO created_at");
        console.log("✓ Login_logs column renamed");
      } else {
        console.log("Adding created_at column to login_logs table...");
        db.exec("ALTER TABLE login_logs ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
        console.log("✓ Created_at column added to login_logs table");
      }
    }
  } catch (err) {
    console.log("Login_logs migration error:", err.message);
  }

  // Seed default brands if none exist
  const brandCount = db.prepare("SELECT COUNT(*) as count FROM brands").get();
  if (brandCount.count === 0) {
    const defaultBrands = [
      { id: uuidv4(), name: "Nike" },
      { id: uuidv4(), name: "Adidas" },
      { id: uuidv4(), name: "Puma" },
      { id: uuidv4(), name: "Zara" },
      { id: uuidv4(), name: "H&M" },
    ];

    const insertBrand = db.prepare("INSERT INTO brands (id, name) VALUES (?, ?)");
    defaultBrands.forEach((brand) => insertBrand.run(brand.id, brand.name));
    console.log("Default brands seeded");
  }
}

module.exports = {
  db,
  initDb,
};
