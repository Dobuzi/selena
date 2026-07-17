/**
 * Build static export for GitHub Pages.
 * Temporarily moves app/api (not supported with output: 'export').
 */
import { existsSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = path.join(root, "src/app/api");
const bak = path.join(root, "src/app/_api_backup_for_static");

function restore() {
  if (existsSync(bak) && !existsSync(api)) {
    renameSync(bak, api);
  }
}

process.on("exit", restore);
process.on("SIGINT", () => {
  restore();
  process.exit(1);
});

if (existsSync(api)) {
  if (existsSync(bak)) rmSync(bak, { recursive: true, force: true });
  renameSync(api, bak);
}

const env = {
  ...process.env,
  STATIC_EXPORT: "1",
  NEXT_PUBLIC_STATIC: "1",
  NEXT_TELEMETRY_DISABLED: "1",
};

const result = spawnSync("npx", ["next", "build"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

restore();
process.exit(result.status ?? 1);
