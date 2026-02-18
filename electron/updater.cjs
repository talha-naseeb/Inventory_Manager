const { autoUpdater } = require("electron-updater");
const { log } = require("./logger.cjs");

/**
 * Initialize the auto-updater.
 * Only runs in production (not dev mode).
 */
function initUpdater(win) {
  // Configure updater logging
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = "info";

  // Don't auto-install — let user decide when to restart
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    log.info("Update available:", info.version);
    win.webContents.send("update-available", { version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    log.info("App is up to date.");
  });

  autoUpdater.on("download-progress", (progress) => {
    win.webContents.send("update-progress", {
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded:", info.version);
    win.webContents.send("update-downloaded", { version: info.version });
  });

  autoUpdater.on("error", (err) => {
    log.error("Auto-updater error:", err);
  });

  // Check for updates immediately, then every 4 hours
  autoUpdater.checkForUpdates().catch((err) => {
    log.warn("Update check failed (may be offline):", err.message);
  });

  setInterval(
    () => {
      autoUpdater.checkForUpdates().catch(() => {});
    },
    4 * 60 * 60 * 1000,
  );
}

function installUpdate() {
  autoUpdater.quitAndInstall();
}

module.exports = { initUpdater, installUpdate };
