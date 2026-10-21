import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

const relay = spawn(process.execPath, [join(root, "scripts/deepgram-live-relay.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

const next = spawn(process.execPath, [nextBin, "dev", "--turbopack"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

function shutdown() {
  relay.kill();
  next.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

relay.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    shutdown();
  }
});

next.on("exit", (code) => {
  relay.kill();
  process.exit(code ?? 0);
});
