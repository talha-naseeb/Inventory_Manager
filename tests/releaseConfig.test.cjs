const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
}

test("electron-builder packages Electron runtime files and built renderer assets explicitly", () => {
  const pkg = readPackageJson();
  const files = pkg.build?.files || [];

  assert.equal(pkg.main, "electron/main.cjs");
  assert.ok(
    files.some((entry) => entry && typeof entry === "object" && entry.from === "electron" && entry.to === "electron"),
    "build.files must copy electron/ into the packaged app",
  );
  assert.ok(
    files.some((entry) => entry && typeof entry === "object" && entry.from === "dist" && entry.to === "dist"),
    "build.files must copy dist/ into the packaged app",
  );
});

test("release scripts expose macOS and Windows packaging targets", () => {
  const pkg = readPackageJson();

  assert.match(pkg.scripts?.dist || "", /electron-builder/);
  assert.match(pkg.scripts?.["dist:mac"] || "", /electron-builder --mac/);
  assert.match(pkg.scripts?.["dist:win"] || "", /electron-builder --win --x64/);
  assert.match(pkg.scripts?.["dist:win:arm64"] || "", /electron-builder --win --arm64/);
});

test("Phase 0 release gate covers static checks, tests, build, and Electron startup", () => {
  const pkg = readPackageJson();
  const releaseCheck = pkg.scripts?.["release:check"] || "";

  for (const requiredScript of ["check:electron", "lint", "typecheck", "test", "build", "test:electron-smoke"]) {
    assert.match(releaseCheck, new RegExp(`npm (?:run )?${requiredScript.replace(":", "\\:")}`));
  }

  assert.ok(fs.existsSync(path.join(repoRoot, ".github/workflows/ci.yml")), "CI workflow must exist");
  assert.ok(fs.existsSync(path.join(repoRoot, "scripts/electron-smoke.cjs")), "Electron smoke runner must exist");
});

test("production renderer uses relative assets so Electron file URLs can load", () => {
  const viteConfig = fs.readFileSync(path.join(repoRoot, "vite.config.ts"), "utf8");
  assert.match(viteConfig, /base:\s*["']\.\/["']/);
});

test("updater events cross the preload boundary with removable listeners", () => {
  const preload = fs.readFileSync(path.join(repoRoot, "electron/preload.cjs"), "utf8");
  const banner = fs.readFileSync(path.join(repoRoot, "src/components/layout/UpdateBanner.tsx"), "utf8");

  assert.match(preload, /updates:\s*\{/);
  assert.match(preload, /removeListener/);
  assert.match(banner, /updates\.onAvailable/);
  assert.match(banner, /unsubscribeAvailable\(\)/);
});
