const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const appName = "inventoriman";
const appData = process.env.APPDATA || (process.platform == "darwin" ? process.env.HOME + "/Library/Application Support" : process.env.HOME + "/.config");
const dbPath = path.join(appData, appName, "inventoriman.db");

console.log("DB Path:", dbPath);
const db = new Database(dbPath);

const columns = db.pragma("table_info(login_logs)");
console.log(
  "Columns in login_logs:",
  columns.map((c) => c.name),
);

const rows = db.prepare("SELECT * FROM login_logs LIMIT 1").all();
console.log("First row keys:", rows.length > 0 ? Object.keys(rows[0]) : "No rows");
