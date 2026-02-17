const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const { db, initDb } = require("./db.cjs");
const crypto = require("crypto");

// Initialize Database
initDb();

// Seed Admin User if none exists
try {
  const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get();
  if (staffCount.count === 0) {
    const adminId = crypto.randomUUID();
    db.prepare("INSERT INTO staff (id, name, pin, role) VALUES (?, ?, ?, ?)").run(adminId, "Administrator", "1234", "owner");
    console.log("Default Admin user created (PIN: 1234)");
  }
} catch (err) {
  console.error("Staff seeding failed:", err);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for Database
ipcMain.handle("db:query", (event, sql, params = []) => {
  try {
    return db.prepare(sql).all(...params);
  } catch (err) {
    console.error("DB Query Error:", err);
    throw err;
  }
});

ipcMain.handle("db:execute", (event, sql, params = []) => {
  try {
    return db.prepare(sql).run(...params);
  } catch (err) {
    console.error("DB Execute Error:", err);
    throw err;
  }
});

ipcMain.handle("db:getOne", (event, sql, params = []) => {
  try {
    return db.prepare(sql).get(...params);
  } catch (err) {
    console.error("DB GetOne Error:", err);
    throw err;
  }
});
