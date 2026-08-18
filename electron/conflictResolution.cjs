const crypto = require("crypto");

/**
 * Conflict Resolution Service
 * Implements field-level merge with vector clocks for optimistic concurrency control
 */

// Field-level merge strategies
const MERGE_STRATEGIES = {
  // Last-write-wins (default)
  lww: (local, remote, base) => remote,

  // Field-level: take the most recent change per field
  fieldLevel: (local, remote, base) => {
    const merged = { ...base };
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base)]);

    for (const key of allKeys) {
      const localVal = local[key];
      const remoteVal = remote[key];
      const baseVal = base[key];

      // If both changed from base, use timestamp comparison (if available) or LWW
      const localChanged = JSON.stringify(localVal) !== JSON.stringify(baseVal);
      const remoteChanged = JSON.stringify(remoteVal) !== JSON.stringify(baseVal);

      if (localChanged && !remoteChanged) {
        merged[key] = localVal;
      } else if (!localChanged && remoteChanged) {
        merged[key] = remoteVal;
      } else if (localChanged && remoteChanged) {
        // Both changed - use LWW based on updated_at or version
        const localTime = local.updated_at || local.version || 0;
        const remoteTime = remote.updated_at || remote.version || 0;
        merged[key] = (remoteTime >= localTime) ? remoteVal : localVal;
      } else {
        merged[key] = baseVal;
      }
    }
    return merged;
  },

  // Sum numeric fields (for quantities, stock)
  sum: (local, remote, base) => {
    const merged = { ...base };
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base)]);

    for (const key of allKeys) {
      const localVal = Number(local[key]) || 0;
      const remoteVal = Number(remote[key]) || 0;
      const baseVal = Number(base[key]) || 0;

      const localChanged = localVal !== baseVal;
      const remoteChanged = remoteVal !== baseVal;

      if (localChanged && remoteChanged) {
        // Both changed - apply both deltas
        merged[key] = baseVal + (localVal - baseVal) + (remoteVal - baseVal);
      } else if (localChanged) {
        merged[key] = localVal;
      } else if (remoteChanged) {
        merged[key] = remoteVal;
      } else {
        merged[key] = baseVal;
      }
    }
    return merged;
  },

  // Max value (for version numbers)
  max: (local, remote, base) => {
    const merged = { ...base };
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base)]);

    for (const key of allKeys) {
      const localVal = local[key];
      const remoteVal = remote[key];
      const baseVal = base[key];

      if (typeof localVal === "number" && typeof remoteVal === "number") {
        merged[key] = Math.max(localVal, remoteVal);
      } else if (localChanged && !remoteChanged) {
        merged[key] = localVal;
      } else if (!localChanged && remoteChanged) {
        merged[key] = remoteVal;
      } else {
        merged[key] = baseVal;
      }
    }
    return merged;
  },
};

// Table-specific merge strategies
const TABLE_STRATEGIES = {
  products: "fieldLevel",
  customers: "fieldLevel",
  orders: "fieldLevel",
  brands: "fieldLevel",
  inventory_logs: "lww", // Append-only, no conflicts expected
  customer_credit_logs: "lww", // Append-only
  rolls: "fieldLevel",
  returns: "fieldLevel",
};

/**
 * Generate a vector clock for an entity
 */
function generateVectorClock(storeId, entityId, version) {
  return JSON.stringify({
    [storeId]: { [entityId]: version || 1 },
    timestamp: Date.now(),
  });
}

/**
 * Parse vector clock
 */
function parseVectorClock(vc) {
  try {
    return JSON.parse(vc || "{}");
  } catch {
    return {};
  }
}

/**
 * Compare vector clocks
 * Returns: 1 if vc1 > vc2, -1 if vc1 < vc2, 0 if concurrent/equal
 */
function compareVectorClocks(vc1, vc2) {
  const clock1 = parseVectorClock(vc1);
  const clock2 = parseVectorClock(vc2);

  // Simplified: compare timestamps
  const time1 = clock1.timestamp || 0;
  const time2 = clock2.timestamp || 0;

  if (time1 > time2) return 1;
  if (time1 < time2) return -1;
  return 0;
}

/**
 * Merge two versions of an entity using field-level strategy
 */
function mergeEntity(local, remote, base, table) {
  const strategyName = TABLE_STRATEGIES[table] || "fieldLevel";
  const strategy = MERGE_STRATEGIES[strategyName] || MERGE_STRATEGIES.fieldLevel;
  return strategy(local, remote, base);
}

/**
 * Detect if there's a conflict between local and remote versions
 */
function detectConflict(local, remote, base) {
  if (!base) return false; // No base = no conflict detection possible

  const localChanged = JSON.stringify(local) !== JSON.stringify(base);
  const remoteChanged = JSON.stringify(remote) !== JSON.stringify(base);

  return localChanged && remoteChanged;
}

/**
 * Build base version from sync queue item
 */
function buildBaseVersion(item) {
  try {
    return item.base_version_json ? JSON.parse(item.base_version_json) : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a conflicted sync item
 */
async function resolveConflict(db, item, strategy = "auto") {
  const { entity_id: entityId, action_type: actionType, store_id: storeId, payload_json } = item;
  const payload = JSON.parse(payload_json);

  // Fetch current local version
  const table = require("./syncPayloads.cjs").TABLE_BY_ACTION[actionType];
  if (!table) {
    return { success: false, error: `Unknown action type: ${actionType}` };
  }

  const localRow = await db.get(`SELECT * FROM ${table} WHERE id = ? AND store_id = ?`, [entityId, storeId]);
  if (!localRow) {
    // Local deleted, remote wins
    return { success: true, resolution: "remote_wins", data: payload };
  }

  // Build base version
  const baseVersion = buildBaseVersion(item);
  if (!baseVersion) {
    // No base version - can't do field-level merge
    // Use LWW based on version column
    const localVersion = localRow.version || 1;
    const remoteVersion = payload.version || 1;

    if (remoteVersion >= localVersion) {
      return { success: true, resolution: "remote_wins", data: payload };
    } else {
      return { success: true, resolution: "local_wins", data: localRow };
    }
  }

  // Check for actual conflict
  const hasConflict = detectConflict(localRow, payload, baseVersion);

  if (!hasConflict) {
    // No conflict - apply whichever changed
    const localChanged = JSON.stringify(localRow) !== JSON.stringify(baseVersion);
    const remoteChanged = JSON.stringify(payload) !== JSON.stringify(baseVersion);

    if (remoteChanged && !localChanged) {
      return { success: true, resolution: "remote_wins", data: payload };
    } else if (localChanged && !remoteChanged) {
      return { success: true, resolution: "local_wins", data: localRow };
    }
    return { success: true, resolution: "no_change", data: localRow };
  }

  // Conflict detected - apply merge strategy
  let resolvedData;
  if (strategy === "local_wins") {
    resolvedData = localRow;
  } else if (strategy === "remote_wins") {
    resolvedData = payload;
  } else {
    // Auto: field-level merge
    resolvedData = mergeEntity(localRow, payload, baseVersion, table);
    // Increment version
    resolvedData.version = Math.max(localRow.version || 1, payload.version || 1) + 1;
  }

  // Update local DB with merged data
  await upsertResolvedData(db, table, resolvedData, storeId);

  // Update sync queue with resolution
  await db.run(
    `UPDATE sync_queue SET 
      conflict_status = 'resolved',
      resolved_at = CURRENT_TIMESTAMP,
      resolution_strategy = ?,
      payload_json = ?,
      status = 'PENDING'
    WHERE id = ?`,
    [strategy === "auto" ? "field_level_merge" : strategy, JSON.stringify(resolvedData), item.id]
  );

  return { success: true, resolution: strategy === "auto" ? "field_level_merge" : strategy, data: resolvedData };
}

/**
 * Upsert resolved data into local table
 */
async function upsertResolvedData(db, table, data, storeId) {
  const columns = Object.keys(data).filter(k => k !== "id").join(", ");
  const placeholders = Object.keys(data).filter(k => k !== "id").map(() => "?").join(", ");
  const values = Object.entries(data).filter(([k]) => k !== "id").map(([, v]) => v);

  const sql = `
    INSERT INTO ${table} (id, ${columns})
    VALUES (?, ${placeholders})
    ON CONFLICT(id) DO UPDATE SET
      ${Object.keys(data).filter(k => k !== "id").map(k => `${k} = excluded.${k}`).join(", ")}
  `;

  await db.run(sql, [data.id, ...values]);
}

/**
 * Get all conflicted items for UI
 */
async function getConflictedItems(db, storeId) {
  return db.all(
    `SELECT * FROM sync_queue 
     WHERE store_id = ? AND conflict_status IN ('pending', 'detected')
     ORDER BY created_at DESC`,
    [storeId]
  );
}

/**
 * Manually resolve a conflict (from UI)
 */
async function manualResolveConflict(db, syncItemId, resolution, resolvedData) {
  const item = await db.get("SELECT * FROM sync_queue WHERE id = ?", [syncItemId]);
  if (!item) {
    return { success: false, error: "Sync item not found" };
  }

  await db.run(
    `UPDATE sync_queue SET 
      conflict_status = 'resolved',
      resolved_at = CURRENT_TIMESTAMP,
      resolution_strategy = ?,
      payload_json = ?,
      status = 'PENDING'
    WHERE id = ?`,
    [resolution, JSON.stringify(resolvedData), syncItemId]
  );

  return { success: true };
}

module.exports = {
  MERGE_STRATEGIES,
  TABLE_STRATEGIES,
  generateVectorClock,
  parseVectorClock,
  compareVectorClocks,
  mergeEntity,
  detectConflict,
  buildBaseVersion,
  resolveConflict,
  upsertResolvedData,
  getConflictedItems,
  manualResolveConflict,
};