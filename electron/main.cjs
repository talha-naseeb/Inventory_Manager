const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const { db, initDb } = require("./db.cjs");
const { log, logStartup, getLogFilePath } = require("./logger.cjs");
const { initLicenseTable, getLicenseStatus, activateLicense } = require("./licenseService.cjs");
const crypto = require("crypto");

// Initialize Database
initDb();
initLicenseTable();

// Seed Admin User if none exists
try {
  const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get();
  if (staffCount.count === 0) {
    const adminId = crypto.randomUUID();
    db.prepare("INSERT INTO staff (id, name, pin, role) VALUES (?, ?, ?, ?)").run(adminId, "Administrator", "1234", "owner");
    log.info("Default Admin user created (PIN: 1234)");
  }
} catch (err) {
  log.error("Staff seeding failed:", err);
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Initialize auto-updater in production only
  if (!isDev) {
    try {
      const { initUpdater } = require("./updater.cjs");
      initUpdater(mainWindow);
    } catch (err) {
      log.warn("Auto-updater init failed:", err.message);
    }
  }
}

app.whenReady().then(() => {
  logStartup(app.getVersion());
  createWindow();
});

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

// ── IPC: File Dialog ──────────────────────────────────────────────────────────
ipcMain.handle("dialog:openFile", async () => {
  const { dialog } = require("electron");
  const fs = require("fs");

  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const sourcePath = result.filePaths[0];
  const fileName = path.basename(sourcePath);
  const userDataPath = app.getPath("userData");
  const assetsDir = path.join(userDataPath, "product-images");
  const fs2 = require("fs");
  if (!fs2.existsSync(assetsDir)) fs2.mkdirSync(assetsDir, { recursive: true });

  const timestamp = Date.now();
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const destFileName = `${baseName}_${timestamp}${ext}`;
  const destPath = path.join(assetsDir, destFileName);
  fs2.copyFileSync(sourcePath, destPath);
  return `file://${destPath}`;
});

// ── IPC: Database ─────────────────────────────────────────────────────────────
ipcMain.handle("db:query", (event, sql, params = []) => {
  try {
    return db.prepare(sql).all(...params);
  } catch (err) {
    log.error("DB Query Error:", err);
    throw err;
  }
});

ipcMain.handle("db:execute", (event, sql, params = []) => {
  try {
    const result = db.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  } catch (err) {
    log.error("DB Execute Error:", err);
    throw err;
  }
});

ipcMain.handle("db:getOne", (event, sql, params = []) => {
  try {
    return db.prepare(sql).get(...params);
  } catch (err) {
    log.error("DB GetOne Error:", err);
    throw err;
  }
});

// ── IPC: License ──────────────────────────────────────────────────────────────
ipcMain.handle("license:getStatus", () => {
  return getLicenseStatus();
});

ipcMain.handle("license:activate", (event, key) => {
  const result = activateLicense(key);
  if (result.success) log.info("License activated:", key);
  else log.warn("License activation failed:", result.error);
  return result;
});

// ── IPC: System Info ──────────────────────────────────────────────────────────
ipcMain.handle("system:getInfo", () => {
  const os = require("os");
  return {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    logFilePath: getLogFilePath(),
    userDataPath: app.getPath("userData"),
  };
});

ipcMain.handle("system:openLogFile", () => {
  shell.openPath(getLogFilePath());
});

// ── IPC: Update ───────────────────────────────────────────────────────────────
ipcMain.handle("update:install", () => {
  if (!isDev) {
    try {
      const { installUpdate } = require("./updater.cjs");
      installUpdate();
    } catch (err) {
      log.error("Install update failed:", err);
    }
  }
});
