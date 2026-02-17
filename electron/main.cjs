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
      webSecurity: false, // Allow file:// protocol for local images
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

// IPC Handler: Open File Dialog for Image Upload
ipcMain.handle("dialog:openFile", async () => {
  const { dialog } = require("electron");
  const fs = require("fs");

  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const sourcePath = result.filePaths[0];
  const fileName = path.basename(sourcePath);
  const userDataPath = app.getPath("userData");
  const assetsDir = path.join(userDataPath, "product-images");

  // Create assets directory if it doesn't exist
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Generate unique filename to avoid conflicts
  const timestamp = Date.now();
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const destFileName = `${baseName}_${timestamp}${ext}`;
  const destPath = path.join(assetsDir, destFileName);

  // Copy file to assets directory
  fs.copyFileSync(sourcePath, destPath);

  // Return the local file path
  return `file://${destPath}`;
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
    const result = db.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
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
