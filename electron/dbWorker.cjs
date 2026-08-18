const { parentPort, workerData } = require("worker_threads");
const Database = require("better-sqlite3");
const path = require("path");

const { dbPath } = workerData;
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

parentPort.on("message", async (task) => {
  const { id, type, sql, params } = task;

  try {
    let result;
    if (type === "all") {
      result = db.prepare(sql).all(...params);
    } else if (type === "get") {
      result = db.prepare(sql).get(...params);
    } else if (type === "run") {
      const info = db.prepare(sql).run(...params);
      result = { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
    } else if (type === "transaction") {
      // For complex transactions, we can pass an array of {sql, params}
      const transaction = db.transaction((queries) => {
        for (const q of queries) {
          db.prepare(q.sql).run(...(q.params || []));
        }
      });
      transaction(params);
      result = { success: true };
    } else if (type === "backup") {
      // params[0] is the destination path
      await db.backup(params[0]);
      result = { success: true };
    } else if (type === "close") {
      db.close();
      result = { success: true };
    }

    parentPort.postMessage({ id, result });
  } catch (error) {
    parentPort.postMessage({ id, error: error.message });
  }
});
