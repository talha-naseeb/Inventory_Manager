const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "InventoriMan POS",
    icon: path.join(__dirname, "../public/vite.svg"), // Placeholder icon
  });

  // In development, load from Vite dev server
  // In production, load from the build output
  win.loadURL(isDev ? "http://localhost:5173" : `file://${path.join(__dirname, "../dist/index.html")}`);

  if (isDev) {
    win.webContents.openDevTools();
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
