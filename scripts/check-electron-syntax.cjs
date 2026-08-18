const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const electronDir = path.resolve(__dirname, "../electron");
const files = fs
  .readdirSync(electronDir)
  .filter((file) => file.endsWith(".cjs"))
  .sort();

for (const file of files) {
  const filePath = path.join(electronDir, file);
  const result = spawnSync(process.execPath, ["--check", filePath], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`Electron syntax check passed (${files.length} files).`);
