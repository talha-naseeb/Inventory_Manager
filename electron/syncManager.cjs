const { ipcMain, app } = require("electron");
const { db } = require("./db.cjs");
const { log } = require("./logger.cjs");
const { prepareSyncOperation } = require("./syncPayloads.cjs");

class SyncManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.isProcessing = false;
    this.interval = null;
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.supabase = null;
    this.setupIpc();
  }

  setupIpc() {
    ipcMain.handle("sync:getStatus", () => this.getPendingCount());
    ipcMain.handle("sync:trigger", () => this.processQueue());

    // Legacy setter (used by cloudLogin flow)
    ipcMain.handle("sync:setSettings", (event, { url, key }) => {
      this.supabaseUrl = url;
      this.supabaseKey = key;
      this.initSupabase();
      log.info("SyncManager: Supabase settings updated via setSettings");
      return { success: true };
    });

    // New: get current settings for UI
    ipcMain.handle("sync:getSettings", async () => {
      const pendingCount = await this.getPendingCount();
      return {
        url: this.supabaseUrl || "",
        isConfigured: !!(this.supabaseUrl && this.supabaseKey),
        pendingCount,
      };
    });

    // New: save Supabase settings to DB + re-init client
    ipcMain.handle("sync:saveSettings", async (event, { url, key }) => {
      try {
        await db.run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", ["supabase_url", url]);
        await db.run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", ["supabase_key", key]);
        this.supabaseUrl = url;
        this.supabaseKey = key;
        this.initSupabase();
        log.info("SyncManager: Supabase settings saved to DB");
        return { success: true };
      } catch (err) {
        log.error("SyncManager: Failed to save settings", err);
        return { success: false, error: err.message };
      }
    });

    // New: test the Supabase connection
    ipcMain.handle("sync:testConnection", async () => {
      if (!this.supabase) return { success: false, error: "Supabase not configured." };
      try {
        const { error } = await this.supabase.from("products").select("id").limit(1);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });
  }

  initSupabase() {
    if (!this.supabaseUrl || !this.supabaseKey) {
      this.supabase = null;
      return;
    }
    try {
      const { createClient } = require("@supabase/supabase-js");
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
      log.info("SyncManager: Supabase client initialized");
    } catch (err) {
      log.error("SyncManager: Failed to init Supabase client", err);
      this.supabase = null;
    }
  }

  async initSettings() {
    try {
      const urlRow = await db.get("SELECT value FROM settings WHERE key = 'supabase_url'");
      const keyRow = await db.get("SELECT value FROM settings WHERE key = 'supabase_key'");
      this.supabaseUrl = urlRow ? urlRow.value : null;
      this.supabaseKey = keyRow ? keyRow.value : null;
      this.initSupabase();
    } catch (err) {
      log.error("SyncManager: Failed to load settings", err);
    }
  }

  async getPendingCount() {
    try {
      const result = await db.get("SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('PENDING', 'FAILED')");
      return result ? result.count : 0;
    } catch {
      return 0;
    }
  }

  start(intervalMs = 30000) {
    this.initSettings().then(() => {
      if (this.interval) clearInterval(this.interval);
      this.interval = setInterval(() => this.processQueue(), intervalMs);
      this.processQueue();
    });
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async processQueue() {
    if (this.isProcessing) return;
    if (!this.supabase) {
      log.info("SyncManager: Skipping sync — Supabase not configured.");
      return;
    }

    this.isProcessing = true;
    let synced = 0;
    let failed = 0;

    try {
      const items = await db.all(`
        SELECT * FROM sync_queue
        WHERE status IN ('PENDING', 'FAILED')
        AND retry_count < 10
        ORDER BY created_at ASC
        LIMIT 50
      `);

      if (items.length > 0) {
        log.info(`SyncManager: Processing ${items.length} queued items...`);
        for (const item of items) {
          try {
            await this.syncItem(item);
            await db.run(
              "UPDATE sync_queue SET status='SYNCED', synced_at=CURRENT_TIMESTAMP, last_error=NULL WHERE id=?",
              [item.id]
            );
            synced++;
          } catch (err) {
            await this.handleFailure(item.id, err.message);
            failed++;
          }
        }
        log.info(`SyncManager: Done — ${synced} synced, ${failed} failed.`);
      }
    } catch (err) {
      log.error("SyncManager: Fatal queue error:", err);
    } finally {
      this.isProcessing = false;
      this.notifyRenderer();
    }
  }

  async syncItem(item) {
    const payload = typeof item.payload_json === "string"
      ? JSON.parse(item.payload_json)
      : item.payload_json || {};

    const actionType = item.action_type;

    const operation = prepareSyncOperation({ actionType, entityId: item.entity_id, payload });
    if (!operation) {
      log.warn(`SyncManager: Unknown action type '${actionType}', skipping.`);
      return; // Mark as synced anyway — no point retrying
    }

    if (operation.operation === "delete") {
      const { error } = await this.supabase.from(operation.table).delete().eq("id", operation.entityId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await this.supabase.from(operation.table).upsert(operation.payload, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    for (const related of operation.related) {
      if (!Array.isArray(related.payload) || related.payload.length === 0) continue;
      const { error } = await this.supabase.from(related.table).upsert(related.payload, { onConflict: "id" });
      if (error) throw new Error(`${related.table} sync: ${error.message}`);
    }
  }

  async handleFailure(id, error) {
    await db.run(
      "UPDATE sync_queue SET status='FAILED', retry_count=retry_count+1, last_error=? WHERE id=?",
      [error, id]
    );
    log.warn(`SyncManager: Item ${id} failed — ${error}`);
  }

  notifyRenderer() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.getPendingCount().then((count) => {
        this.mainWindow.webContents.send("sync:status-changed", {
          pendingCount: count,
          lastSync: new Date().toISOString(),
          isConfigured: !!(this.supabaseUrl && this.supabaseKey),
        });
      });
    }
  }
}

module.exports = SyncManager;
