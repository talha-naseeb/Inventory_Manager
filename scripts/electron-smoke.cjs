const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const electronPath = require("electron");
const smokeDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "inventoriman-electron-smoke-"));
const childEnv = {
  ...process.env,
  INVENTORIMAN_SMOKE_TEST: "1",
  INVENTORIMAN_SMOKE_USER_DATA: smokeDataPath,
};

delete childEnv.ELECTRON_RUN_AS_NODE;

const needsVirtualDisplay = process.platform === "linux" && !childEnv.DISPLAY;
const command = needsVirtualDisplay ? "xvfb-run" : electronPath;
const args = needsVirtualDisplay ? ["-a", electronPath, "."] : ["."];
const child = spawn(command, args, {
  cwd: repoRoot,
  env: childEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
let finished = false;

function collect(chunk, stream) {
  const text = chunk.toString();
  output += text;
  stream.write(text);
}

child.stdout.on("data", (chunk) => collect(chunk, process.stdout));
child.stderr.on("data", (chunk) => collect(chunk, process.stderr));

const timeout = setTimeout(() => {
  if (!finished) {
    child.kill("SIGTERM");
    console.error("Electron smoke test timed out after 30 seconds.");
  }
}, 30_000);

child.on("error", (error) => {
  clearTimeout(timeout);
  finished = true;
  fs.rmSync(smokeDataPath, { recursive: true, force: true });
  console.error("Electron smoke test could not start:", error);
  process.exitCode = 1;
});

child.on("close", (code) => {
  clearTimeout(timeout);
  finished = true;
  fs.rmSync(smokeDataPath, { recursive: true, force: true });

  if (code !== 0 || !output.includes("ELECTRON_SMOKE_READY")) {
    console.error(`Electron smoke test failed (exit code ${code}).`);
    process.exitCode = 1;
    return;
  }

  console.log("Electron startup smoke test passed with an isolated temporary database.");
});
