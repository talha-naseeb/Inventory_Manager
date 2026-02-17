const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");
const { v4: uuidv4 } = require("uuid");

// Database file path
const dbPath = path.join(app.getPath("userData"), "inventoriman.db");
console.log("Database path:", dbPath);

const db = new Database(dbPath);

console.log("Starting manual migration...");

try {
  // Enable foreign keys
  db.pragma("foreign_keys = OFF");

  // Check if categories table exists
  const categoriesExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").get();
  console.log("Categories table exists:", !!categoriesExists);

  // Step 1: Create brands table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      logo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Brands table created/verified");

  // Step 2: Migrate categories to brands if categories exists
  if (categoriesExists) {
    db.exec(`
      INSERT OR IGNORE INTO brands (id, name, created_at)
      SELECT id, name, created_at FROM categories;
    `);
    console.log("✓ Categories migrated to brands");
  }

  // Step 3: Check if products table has category_id or brand_id
  const productsInfo = db.prepare("PRAGMA table_info(products)").all();
  const hasCategoryId = productsInfo.some((col) => col.name === "category_id");
  const hasBrandId = productsInfo.some((col) => col.name === "brand_id");

  console.log("Products has category_id:", hasCategoryId);
  console.log("Products has brand_id:", hasBrandId);

  // Step 4: Recreate products table with brand_id
  if (hasCategoryId || !hasBrandId) {
    console.log("Recreating products table...");

    db.exec(`
      -- Create new products table
      CREATE TABLE IF NOT EXISTS products_new (
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

      -- Copy data (handle both old and new schema)
      INSERT OR IGNORE INTO products_new (id, name, description, sku, brand_id, price, wholesale_price, cost_price, image, stock, created_at)
      SELECT 
        id, 
        name, 
        description, 
        sku, 
        COALESCE(brand_id, category_id) as brand_id,
        price, 
        wholesale_price, 
        cost_price, 
        image, 
        stock, 
        created_at 
      FROM products;

      -- Drop old table
      DROP TABLE IF EXISTS products;

      -- Rename new table
      ALTER TABLE products_new RENAME TO products;
    `);
    console.log("✓ Products table recreated with brand_id");
  }

  // Step 5: Recreate order_items with proper foreign keys
  console.log("Recreating order_items table...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items_new (
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

    INSERT OR IGNORE INTO order_items_new SELECT * FROM order_items;
    DROP TABLE IF EXISTS order_items;
    ALTER TABLE order_items_new RENAME TO order_items;
  `);
  console.log("✓ Order_items table recreated with proper foreign keys");

  // Step 6: Drop categories table
  if (categoriesExists) {
    db.exec("DROP TABLE IF EXISTS categories");
    console.log("✓ Categories table dropped");
  }

  // Step 7: Seed default brands if none exist
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
    console.log("✓ Default brands seeded");
  }

  // Re-enable foreign keys
  db.pragma("foreign_keys = ON");

  console.log("\n✅ Migration completed successfully!");
  console.log("\nFinal verification:");
  console.log("Brands count:", db.prepare("SELECT COUNT(*) as count FROM brands").get().count);
  console.log("Products count:", db.prepare("SELECT COUNT(*) as count FROM products").get().count);
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
}

db.close();
console.log("\nDatabase closed. Please restart the application.");
