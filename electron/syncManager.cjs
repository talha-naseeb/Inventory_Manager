const { app } = require("electron");
const { db } = require("./db.cjs");
const { log } = require("./logger.cjs");
const { prepareSyncOperation } = require("./syncPayloads.cjs");
const { normalizeStoreActivation, normalizeStoreId, normalizeSyncSettings } = require("./supabaseSyncConfig.cjs");
const {
  generateVectorClock,
  parseVectorClock,
  detectConflict,
  buildBaseVersion,
  resolveConflict,
  getConflictedItems,
  manualResolveConflict,
  upsertResolvedData,
} = require("./conflictResolution.cjs");

class SyncManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.isProcessing = false;
    this.interval = null;
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.storeId = null;
    this.storeName = null;
    this.userEmail = null;
    this.session = null;
    this.supabase = null;
    this.realtimeChannel = null;
  }

  async getSettings() {
    const pendingCount = await this.getPendingCount();
    return {
      url: this.supabaseUrl || "",
      isConfigured: !!(this.supabaseUrl && this.supabaseKey),
      isActivated: this.isActivated(),
      isAuthenticated: !!this.session?.access_token,
      storeId: this.storeId || "",
      storeName: this.storeName || "",
      userEmail: this.userEmail || "",
      pendingCount,
    };
  }

  async testConnection() {
    if (!this.isSyncReady()) return { success: false, error: "Supabase is not signed in and activated for a store." };
    try {
      const { error } = await this.supabase.from("products").select("id").eq("store_id", this.storeId).limit(1);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getConflicts() {
    if (!this.isSyncReady()) return { success: false, error: "Sync not ready" };
    try {
      return { success: true, conflicts: await getConflictedItems(db, this.storeId) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async resolveConflict(syncItemId, resolution, resolvedData) {
    if (!this.isSyncReady()) return { success: false, error: "Sync not ready" };
    try {
      const result = await manualResolveConflict(db, syncItemId, resolution, resolvedData);
      if (result.success) this.notifyRenderer();
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async autoResolveAllConflicts() {
    if (!this.isSyncReady()) return { success: false, error: "Sync not ready" };
    try {
      const conflicts = await getConflictedItems(db, this.storeId);
      let resolved = 0;
      for (const conflict of conflicts) {
        const result = await resolveConflict(db, conflict, "auto");
        if (result.success) resolved++;
      }
      this.notifyRenderer();
      return { success: true, resolved };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async saveSyncSettings({ url, key }) {
    const currentKey = this.supabaseKey || (await db.get("SELECT value FROM settings WHERE key = 'supabase_key'"))?.value || "";
    const settings = normalizeSyncSettings({ url, key, currentKey });

    await this.saveSetting("supabase_url", settings.url);
    await this.saveSetting("supabase_key", settings.key);
    this.supabaseUrl = settings.url;
    this.supabaseKey = settings.key;
    await this.initSupabase();
    log.info("SyncManager: Supabase settings saved to DB");
    return { success: true };
  }

  async saveSetting(key, value) {
    await db.run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [key, value]);
  }

  async signIn(args = {}) {
    try {
      const currentKey = this.supabaseKey || (await db.get("SELECT value FROM settings WHERE key = 'supabase_key'"))?.value || "";
      const settings = normalizeSyncSettings({ url: args.url || this.supabaseUrl, key: args.key || "", currentKey });
      const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
      const password = typeof args.password === "string" ? args.password : "";
      const requestedStoreId = args.storeId ? normalizeStoreId(args.storeId, { allowDefault: false }) : null;

      if (!email || !password) {
        throw new Error("Cloud email and password are required.");
      }

      const { createClient } = require("@supabase/supabase-js");
      const client = createClient(settings.url, settings.key, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      });

      const { data: authData, error: authError } = await client.auth.signInWithPassword({ email, password });
      if (authError) throw new Error(authError.message);
      if (!authData?.session?.access_token || !authData?.user?.id) {
        throw new Error("Cloud sign-in did not return a valid session.");
      }

      let membershipQuery = client.from("store_members").select("store_id, role, stores(name)").limit(10);
      if (requestedStoreId) membershipQuery = membershipQuery.eq("store_id", requestedStoreId);
      const { data: memberships, error: membershipError } = await membershipQuery;
      if (membershipError) throw new Error(membershipError.message);
      const membership = Array.isArray(memberships) ? memberships[0] : null;
      if (!membership?.store_id) {
        throw new Error(requestedStoreId ? "This cloud user is not a member of the requested store." : "This cloud user is not assigned to any pilot store.");
      }

      const storeName = Array.isArray(membership.stores)
        ? membership.stores[0]?.name
        : membership.stores?.name;
      const activation = normalizeStoreActivation({
        storeId: membership.store_id,
        storeName,
        userEmail: authData.user.email || email,
      });

      this.supabaseUrl = settings.url;
      this.supabaseKey = settings.key;
      this.storeId = activation.storeId;
      this.storeName = activation.storeName;
      this.userEmail = activation.userEmail;
      this.session = {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        token_type: authData.session.token_type,
        user: { id: authData.user.id, email: activation.userEmail },
      };

      await this.saveSetting("supabase_url", settings.url);
      await this.saveSetting("supabase_key", settings.key);
      await this.saveSetting("cloud_store_id", activation.storeId);
      await this.saveSetting("cloud_store_name", activation.storeName);
      await this.saveSetting("cloud_user_email", activation.userEmail);
      await this.saveSetting("cloud_auth_session", JSON.stringify(this.session));
      await this.initSupabase();

      return {
        success: true,
        storeId: activation.storeId,
        storeName: activation.storeName,
        userEmail: activation.userEmail,
      };
    } catch (err) {
      log.error("SyncManager: Cloud sign-in failed", err);
      return { success: false, error: err.message };
    }
  }

  async signOut() {
    try {
      if (this.realtimeChannel) {
        this.realtimeChannel.unsubscribe();
        this.realtimeChannel = null;
      }
      if (this.supabase) {
        await this.supabase.auth.signOut();
      }
    } catch (err) {
      log.warn("SyncManager: Cloud sign-out warning", err);
    }

    this.session = null;
    this.userEmail = null;
    this.supabase = null;
    await this.saveSetting("cloud_auth_session", "");
    await this.saveSetting("cloud_user_email", "");
    this.notifyRenderer();
    return { success: true };
  }

  getSession() {
    return {
      isConfigured: !!(this.supabaseUrl && this.supabaseKey),
      isActivated: this.isActivated(),
      isAuthenticated: !!this.session?.access_token,
      storeId: this.storeId || "",
      storeName: this.storeName || "",
      userEmail: this.userEmail || "",
    };
  }

  isActivated() {
    return !!this.storeId && this.storeId !== "default";
  }

  isSyncReady() {
    return !!(this.supabase && this.supabaseUrl && this.supabaseKey && this.isActivated() && this.session?.access_token);
  }

  async initSupabase() {
    if (!this.supabaseUrl || !this.supabaseKey || !this.isActivated() || !this.session?.access_token) {
      this.supabase = null;
      return;
    }
    try {
      const { createClient } = require("@supabase/supabase-js");
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      });
      const { error } = await this.supabase.auth.setSession({
        access_token: this.session.access_token,
        refresh_token: this.session.refresh_token || "",
      });
      if (error) throw new Error(error.message);
      log.info("SyncManager: Supabase client initialized");
      
      this.setupRealtime();
    } catch (err) {
      log.error("SyncManager: Failed to init Supabase client", err);
      this.supabase = null;
    }
  }

  setupRealtime() {
    if (!this.supabase || !this.storeId) return;

    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    log.info(`SyncManager: Setting up realtime for store ${this.storeId}`);

    this.realtimeChannel = this.supabase
      .channel(`store:${this.storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          filter: `store_id=eq.${this.storeId}`,
        },
        (payload) => {
          this.handleRealtimeChange(payload).catch(err => {
            log.error("SyncManager: Realtime handler error", err);
          });
        }
      )
      .subscribe((status) => {
        log.info(`SyncManager: Realtime subscription status: ${status}`);
      });
  }

  async handleRealtimeChange(payload) {
    const { eventType, new: newRecord, old: oldRecord, table } = payload;
    
    // Safety check for store_id even though it's filtered
    const recordStoreId = newRecord?.store_id || oldRecord?.store_id;
    if (recordStoreId !== this.storeId) return;

    log.info(`SyncManager: Realtime ${eventType} on ${table}`);

    if (eventType === "DELETE") {
      // Local delete if it exists
      await db.run(`DELETE FROM ${table} WHERE id = ? AND store_id = ?`, [oldRecord.id, this.storeId]);
    } else {
      // Upsert into local DB
      // 1. Check if we have a pending sync for this item
      const pendingSync = await db.get(
        "SELECT id FROM sync_queue WHERE entity_id = ? AND status IN ('PENDING', 'FAILED') AND store_id = ?",
        [newRecord.id, this.storeId]
      );
      
      if (pendingSync) {
        log.info(`SyncManager: Realtime change ignored for ${table}:${newRecord.id} (local sync pending)`);
        return;
      }
      
      // 2. Check local version vs remote version
      const localRecord = await db.get(`SELECT version FROM ${table} WHERE id = ? AND store_id = ?`, [newRecord.id, this.storeId]);
      if (localRecord && (localRecord.version || 0) >= (newRecord.version || 0)) {
        return; // Already up to date or newer locally
      }

      // 3. Update local DB
      await upsertResolvedData(db, table, newRecord, this.storeId);
    }
    this.notifyRenderer();
  }

  async initSettings() {
    try {
      const urlRow = await db.get("SELECT value FROM settings WHERE key = 'supabase_url'");
      const keyRow = await db.get("SELECT value FROM settings WHERE key = 'supabase_key'");
      const storeIdRow = await db.get("SELECT value FROM settings WHERE key = 'cloud_store_id'");
      const storeNameRow = await db.get("SELECT value FROM settings WHERE key = 'cloud_store_name'");
      const userEmailRow = await db.get("SELECT value FROM settings WHERE key = 'cloud_user_email'");
      const sessionRow = await db.get("SELECT value FROM settings WHERE key = 'cloud_auth_session'");
      this.supabaseUrl = urlRow ? urlRow.value : null;
      this.supabaseKey = keyRow ? keyRow.value : null;
      this.storeId = storeIdRow?.value || null;
      this.storeName = storeNameRow?.value || null;
      this.userEmail = userEmailRow?.value || null;
      this.session = sessionRow?.value ? JSON.parse(sessionRow.value) : null;
      await this.initSupabase();
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
    if (!this.isSyncReady()) {
      log.info("SyncManager: Skipping sync — Supabase is not signed in and activated for a store.");
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
        AND store_id = ?
        ORDER BY created_at ASC
        LIMIT 50
      `, [this.storeId]);

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

    if (operation.storeId !== this.storeId) {
      throw new Error(`Sync item store '${operation.storeId}' does not match activated store '${this.storeId}'.`);
    }

    // Check for conflicts before syncing
    const table = operation.table;
    const entityId = operation.entityId;
    
    // Fetch remote version from Supabase
    let remoteData = null;
    if (operation.operation !== "delete") {
      const { data, error } = await this.supabase
        .from(table)
        .select("*")
        .eq("id", entityId)
        .eq("store_id", operation.storeId)
        .single();
      
      if (error && error.code !== "PGRST116") { // PGRST116 = no rows found
        throw new Error(error.message);
      }
      remoteData = data;
    }

    // Fetch local version
    const localData = await db.get(`SELECT * FROM ${table} WHERE id = ? AND store_id = ?`, [entityId, this.storeId]);

    // Build base version from sync queue item
    const baseVersion = buildBaseVersion(item);

    // Detect conflict
    let hasConflict = false;
    if (remoteData && localData && baseVersion) {
      hasConflict = detectConflict(localData, remoteData, baseVersion);
    }

    if (hasConflict) {
      // Mark as conflicted and notify renderer
      await db.run(
        `UPDATE sync_queue SET conflict_status = 'detected', base_version_json = ? WHERE id = ?`,
        [JSON.stringify(baseVersion), item.id]
      );
      
      // Notify renderer about conflict
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send("sync:conflict-detected", {
          syncItemId: item.id,
          entityId,
          table,
          localData,
          remoteData,
          baseVersion,
        });
      }
      
      log.info(`SyncManager: Conflict detected for ${table}:${entityId}, waiting for resolution`);
      return; // Don't process, wait for manual/auto resolution
    }

    // No conflict - proceed with normal sync
    if (operation.operation === "delete") {
      const { error } = await this.supabase.from(operation.table).delete().eq("id", operation.entityId).eq("store_id", operation.storeId);
      if (error) throw new Error(error.message);
    } else {
      // Include vector clock in payload
      const payloadWithClock = {
        ...operation.payload,
        version: (operation.payload.version || 1) + 1,
      };
      
      const { error } = await this.supabase.from(operation.table).upsert(payloadWithClock, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    for (const related of operation.related) {
      if (!Array.isArray(related.payload) || related.payload.length === 0) continue;
      for (const relatedPayload of related.payload) {
        if (relatedPayload.store_id !== this.storeId) {
          throw new Error(`${related.table} sync item store '${relatedPayload.store_id}' does not match activated store '${this.storeId}'.`);
        }
      }
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
        // Also get conflicts count
        db.get("SELECT COUNT(*) as count FROM sync_queue WHERE store_id = ? AND conflict_status IN ('detected', 'pending')", [this.storeId])
          .then((conflictResult) => {
            const conflictsCount = conflictResult ? conflictResult.count : 0;
            this.mainWindow.webContents.send("sync:status-changed", {
              pendingCount: count,
              conflictsCount,
              lastSync: new Date().toISOString(),
              isConfigured: !!(this.supabaseUrl && this.supabaseKey),
              isActivated: this.isActivated(),
              storeId: this.storeId || "",
            });
          })
          .catch(() => {
            this.mainWindow.webContents.send("sync:status-changed", {
              pendingCount: count,
              conflictsCount: 0,
              lastSync: new Date().toISOString(),
              isConfigured: !!(this.supabaseUrl && this.supabaseKey),
              isActivated: this.isActivated(),
              storeId: this.storeId || "",
            });
          });
      });
    }
  }
}

module.exports = SyncManager;
