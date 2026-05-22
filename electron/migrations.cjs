const { log } = require("./logger.cjs");
const { createInitialOwnerPin, hashPin } = require("./pinService.cjs");

async function ensureColumn(db, table, column, definition) {
  const columns = await db.all(`PRAGMA table_info(${table})`);
  if (!columns.some((existingColumn) => existingColumn.name === column)) {
    await db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/**
 * Migration Engine for Professional SaaS
 */
async function runMigrations(db) {
  // 1. Ensure migrations table exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrations = [
    {
      name: "001_initial_baseline",
      up: async (db) => {
        // Initial SaaS Tables
        await db.run(`
          CREATE TABLE IF NOT EXISTS brands (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            logo TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            name TEXT NOT NULL,
            description TEXT,
            sku TEXT UNIQUE,
            brand_id TEXT,
            price REAL DEFAULT 0,
            wholesale_price REAL DEFAULT 0,
            cost_price REAL DEFAULT 0,
            image TEXT,
            stock REAL DEFAULT 0,
            unit TEXT DEFAULT 'item',
            meters_per_unit REAL DEFAULT 1.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE SET NULL
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
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
            original_order_id TEXT,
            returned_items_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL,
            FOREIGN KEY (original_order_id) REFERENCES orders (id) ON DELETE SET NULL
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            order_id TEXT NOT NULL,
            product_id TEXT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity REAL NOT NULL,
            total REAL NOT NULL,
            price_type TEXT DEFAULT 'retail',
            unit TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS inventory_logs (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            product_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            previous_stock REAL,
            current_stock REAL,
            reason TEXT,
            staff_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            action_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            payload_json TEXT,
            status TEXT DEFAULT 'PENDING',
            retry_count INTEGER DEFAULT 0,
            last_error TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced_at DATETIME
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS staff (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            name TEXT NOT NULL,
            pin TEXT NOT NULL,
            role TEXT DEFAULT 'cashier',
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS login_logs (
            id TEXT PRIMARY KEY,
            staff_id TEXT NOT NULL,
            action TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE CASCADE
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
    },
    {
      name: "002_enable_wal_mode",
      up: async (db) => {
        // WAL mode is handled in dbWorker.cjs initialization but we log it here
        log.info("WAL Mode baseline established via worker thread.");
      }
    },
    {
      name: "003_seed_default_owner",
      up: async (db) => {
        const existing = await db.get("SELECT id FROM staff WHERE role = 'owner' LIMIT 1");
        if (!existing) {
          log.info("Seeding default owner account...");
          const initialPin = createInitialOwnerPin();
          await db.run(
            "INSERT INTO staff (id, store_id, name, pin, role, status) VALUES (?, ?, ?, ?, ?, ?)",
            ["admin-001", "default", "System Owner", initialPin, "owner", "active"]
          );
        } else {
          log.info("Default owner already exists; leaving PIN unchanged.");
        }
      }
    },
    {
      name: "004_add_runtime_support_tables",
      up: async (db) => {
        await db.run(`
          CREATE TABLE IF NOT EXISTS rolls (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            product_id TEXT NOT NULL,
            roll_number TEXT,
            initial_length REAL DEFAULT 0,
            current_length REAL DEFAULT 0,
            unit TEXT DEFAULT 'meter',
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS returns (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            order_id TEXT NOT NULL,
            return_value REAL DEFAULT 0,
            items_json TEXT,
            status TEXT DEFAULT 'completed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
          )
        `);
      }
    },
    {
      name: "005_hash_staff_pins",
      up: async (db) => {
        await ensureColumn(db, "staff", "pin_hash", "TEXT");

        const staffRows = await db.all("SELECT id, pin, pin_hash FROM staff");
        for (const staff of staffRows) {
          if (!staff.pin_hash && staff.pin) {
            await db.run("UPDATE staff SET pin_hash = ?, pin = '' WHERE id = ?", [hashPin(staff.pin), staff.id]);
          }
        }
      }
    },
    {
      name: "006_ensure_upgrade_columns",
      up: async (db) => {
        await ensureColumn(db, "staff", "store_id", "TEXT DEFAULT 'default'");
        await ensureColumn(db, "staff", "status", "TEXT DEFAULT 'active'");
        await ensureColumn(db, "staff", "pin_hash", "TEXT");

        await ensureColumn(db, "sync_queue", "store_id", "TEXT DEFAULT 'default'");
        await ensureColumn(db, "sync_queue", "retry_count", "INTEGER DEFAULT 0");
        await ensureColumn(db, "sync_queue", "last_error", "TEXT");
        await ensureColumn(db, "sync_queue", "synced_at", "DATETIME");

        await ensureColumn(db, "rolls", "store_id", "TEXT DEFAULT 'default'");
        await ensureColumn(db, "rolls", "status", "TEXT DEFAULT 'active'");
        await ensureColumn(db, "rolls", "updated_at", "DATETIME");

        await ensureColumn(db, "returns", "store_id", "TEXT DEFAULT 'default'");

        await db.run("UPDATE staff SET store_id = COALESCE(store_id, 'default'), status = COALESCE(status, 'active')");
        await db.run("UPDATE sync_queue SET store_id = COALESCE(store_id, 'default'), retry_count = COALESCE(retry_count, 0)");
        await db.run("UPDATE rolls SET store_id = COALESCE(store_id, 'default'), status = COALESCE(status, 'active')");
        await db.run("UPDATE returns SET store_id = COALESCE(store_id, 'default')");
      }
    },
    {
      name: "007_exchange_balance_support",
      up: async (db) => {
        await ensureColumn(db, "returns", "replacement_order_id", "TEXT");
        await ensureColumn(db, "returns", "balance_outcome", "TEXT DEFAULT 'none'");
        await ensureColumn(db, "returns", "amount_due", "REAL DEFAULT 0");
        await ensureColumn(db, "returns", "remaining_balance", "REAL DEFAULT 0");
        await ensureColumn(db, "customers", "store_credit_balance", "REAL DEFAULT 0");

        await db.run(`
          CREATE TABLE IF NOT EXISTS customer_credit_logs (
            id TEXT PRIMARY KEY,
            store_id TEXT DEFAULT 'default',
            customer_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_id TEXT,
            order_id TEXT,
            amount REAL NOT NULL,
            balance_after REAL NOT NULL,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
          )
        `);

        await db.run("UPDATE returns SET balance_outcome = COALESCE(balance_outcome, 'none'), amount_due = COALESCE(amount_due, 0), remaining_balance = COALESCE(remaining_balance, 0)");
        await db.run("UPDATE customers SET store_credit_balance = COALESCE(store_credit_balance, 0)");
      }
    },
    {
      name: "008_business_profile_settings",
      up: async (db) => {
        await db.run(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await ensureColumn(db, "settings", "updated_at", "DATETIME");
        await db.run("UPDATE settings SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)");
        await db.run("DELETE FROM settings WHERE key IS NOT NULL AND rowid NOT IN (SELECT MAX(rowid) FROM settings WHERE key IS NOT NULL GROUP BY key)");
        await db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key_unique ON settings(key)");
        await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ["business_type", "general"]);
        await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ["custom_stock_unit", ""]);
      }
    }
  ];

  const appliedMigrations = await db.all("SELECT name FROM migrations");
  const appliedNames = new Set(appliedMigrations.map(m => m.name));

  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      log.info(`Applying migration: ${migration.name}`);
      try {
        await migration.up(db);
        await db.run("INSERT INTO migrations (name) VALUES (?)", [migration.name]);
        log.info(`✓ Migration ${migration.name} successful`);
      } catch (err) {
        log.error(`❌ Migration ${migration.name} failed:`, err);
        throw err;
      }
    }
  }
}

module.exports = { runMigrations };
