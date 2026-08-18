const { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } = require("electron");
const path = require("node:path");
const { db, initDb } = require("./db.cjs");
const { log, logStartup, getLogFilePath } = require("./logger.cjs");
const { initLicenseTable, getLicenseStatus, activateLicense } = require("./licenseService.cjs");
const SyncManager = require("./syncManager.cjs");
const { createOrder } = require("./orderService.cjs");
const { recordReturn } = require("./returnService.cjs");
const { finalizeExchange } = require("./exchangeService.cjs");
const { clearData } = require("./databaseMaintenance.cjs");
const { searchProducts } = require("./productSearchService.cjs");
const { hashPin, verifyPin } = require("./pinService.cjs");
const { assetUrlToPath, toAssetUrl, toFetchableFileUrl } = require("./assetProtocol.cjs");
const { SessionManager, isTrustedRendererUrl } = require("./ipcSecurity.cjs");
const { createIpcRouter } = require("./ipcRouter.cjs");
const { registerApplicationIpc } = require("./applicationIpc.cjs");
const { buildContentSecurityPolicy } = require("./contentSecurityPolicy.cjs");

const isSmokeTest = process.env.INVENTORIMAN_SMOKE_TEST === "1";
const smokeUserDataPath = process.env.INVENTORIMAN_SMOKE_USER_DATA;
const distPath = path.join(__dirname, "../dist");
const devOrigin = "http://localhost:5173";

if (isSmokeTest && smokeUserDataPath) app.setPath("userData", smokeUserDataPath);

protocol.registerSchemesAsPrivileged([
  { scheme: "app-assets", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let mainWindow = null;
let syncManager = null;
let sessionManager = null;

function trustedUrl(url) {
  return isTrustedRendererUrl(url, { isPackaged: app.isPackaged || isSmokeTest, distPath, devOrigin });
}

function isTrustedSender(event) {
  return trustedUrl(event.senderFrame?.url || event.sender?.getURL?.() || "");
}

function installContentSecurityPolicy() {
  const policy = buildContentSecurityPolicy({ isDevelopment: !app.isPackaged && !isSmokeTest });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [policy] } });
  });
}

function createWindow() {
  const isDev = !app.isPackaged;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: !isSmokeTest,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  const webContentsId = mainWindow.webContents.id;
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  const blockUnexpectedNavigation = (event, targetUrl) => {
    if (!trustedUrl(targetUrl)) event.preventDefault();
  };
  mainWindow.webContents.on("will-navigate", blockUnexpectedNavigation);
  mainWindow.webContents.on("will-redirect", blockUnexpectedNavigation);
  mainWindow.webContents.on("destroyed", () => sessionManager?.clear(webContentsId));

  if (isSmokeTest) {
    mainWindow.webContents.once("did-fail-load", (_event, errorCode, errorDescription) => {
      console.error(`ELECTRON_SMOKE_FAILED: renderer load failed (${errorCode}: ${errorDescription})`);
      app.exit(1);
    });
    mainWindow.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        try {
          const rendererMounted = await mainWindow.webContents.executeJavaScript("Boolean(document.querySelector('#root')?.childElementCount)");
          if (!rendererMounted) throw new Error("renderer root did not mount");
          console.log("ELECTRON_SMOKE_READY");
          app.quit();
        } catch (error) {
          console.error("ELECTRON_SMOKE_FAILED:", error);
          app.exit(1);
        }
      }, 250);
    });
  }

  if (isDev && !isSmokeTest) mainWindow.loadURL(devOrigin);
  else mainWindow.loadFile(path.join(distPath, "index.html"));

  syncManager = new SyncManager(mainWindow);
  syncManager.start();

  if (!isDev) {
    try {
      require("./updater.cjs").initUpdater(mainWindow);
    } catch (error) {
      log.error("Updater initialization failed:", error);
    }
  }
}

app.whenReady().then(async () => {
  protocol.handle("app-assets", (request) => {
    const filePath = assetUrlToPath(request.url);
    const userDataPath = app.getPath("userData");
    const relativePath = path.relative(userDataPath, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return new Response("Forbidden", { status: 403 });
    return net.fetch(toFetchableFileUrl(filePath));
  });

  await initDb();
  await initLicenseTable();
  installContentSecurityPolicy();

  sessionManager = new SessionManager(db);
  const router = createIpcRouter({ ipcMain, sessionManager, isTrustedSender, log });
  registerApplicationIpc({
    router, sessionManager, db, app, dialog, shell, log, getLogFilePath, toAssetUrl,
    searchProducts, createOrder, recordReturn, finalizeExchange, clearData, hashPin, verifyPin,
    getLicenseStatus, activateLicense, getSyncManager: () => syncManager,
  });

  logStartup(app.getVersion());
  createWindow();
}).catch((error) => {
  log.error("Application startup failed:", error);
  app.exit(1);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
