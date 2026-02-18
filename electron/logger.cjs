const log = require("electron-log");
const path = require("path");
const { app } = require("electron");
const os = require("os");

// Configure log file location: %APPDATA%/inventoriMan/logs/main.log
log.transports.file.resolvePathFn = () => path.join(app.getPath("userData"), "logs", "main.log");

// Log format: [timestamp] [level] message
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}";
log.transports.file.maxSize = 5 * 1024 * 1024; // 5 MB max

// Also log to console in dev
log.transports.console.level = "debug";

// Capture unhandled errors
process.on("uncaughtException", (err) => {
  log.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  log.error("Unhandled Rejection:", reason);
});

// Log startup info
function logStartup(version) {
  log.info("=".repeat(50));
  log.info(`InventoriMan v${version} starting...`);
  log.info(`OS: ${os.type()} ${os.release()} (${os.arch()})`);
  log.info(`Node: ${process.versions.node}`);
  log.info(`Electron: ${process.versions.electron}`);
  log.info(`User Data: ${app.getPath("userData")}`);
  log.info("=".repeat(50));
}

function getLogFilePath() {
  return path.join(app.getPath("userData"), "logs", "main.log");
}

module.exports = { log, logStartup, getLogFilePath };
