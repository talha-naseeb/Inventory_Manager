const { Worker } = require("worker_threads");
const path = require("path");
const { app } = require("electron");
const { v4: uuidv4 } = require("uuid");

const dbPath = path.join(app.getPath("userData"), "inventoriman.db");

// We spawn the worker thread
const worker = new Worker(path.join(__dirname, "dbWorker.cjs"), {
  workerData: { dbPath }
});

// A map to keep track of pending requests
const pendingRequests = new Map();

worker.on("message", (response) => {
  const { id, result, error } = response;
  const request = pendingRequests.get(id);
  
  if (request) {
    if (error) request.reject(new Error(error));
    else request.resolve(result);
    pendingRequests.delete(id);
  }
});

/**
 * Proxy object to communicate with the worker
 */
const db = {
  all: (sql, params = []) => dispatch("all", sql, params),
  get: (sql, params = []) => dispatch("get", sql, params),
  run: (sql, params = []) => dispatch("run", sql, params),
  transaction: (queries) => dispatch("transaction", null, queries),
  
  // Helper for one-off manual preparation logic if needed
  prepare: (sql) => ({
    all: (...params) => dispatch("all", sql, params),
    get: (...params) => dispatch("get", sql, params),
    run: (...params) => dispatch("run", sql, params),
  })
};

function dispatch(type, sql, params) {
  const id = uuidv4();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ id, type, sql, params });
  });
}

const { runMigrations } = require("./migrations.cjs");

/**
 * Initialize Tables (using the new async db proxy)
 */
async function initDb() {
  console.log("DB: Initializing database via Worker...");
  try {
    await runMigrations(db);
    console.log("✓ DB: All migrations applied successfully");
  } catch (err) {
    console.error("DB Initialization Error:", err);
  }
}

module.exports = {
  db,
  initDb,
};
