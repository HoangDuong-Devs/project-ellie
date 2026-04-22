import { spawn } from "node:child_process";

const children = [];
let shuttingDown = false;

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const other of children) {
      if (other.pid && other.pid !== child.pid) {
        other.kill("SIGTERM");
      }
    }
    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[dev-with-worker] ${name} exited with ${detail}`);
    process.exit(code ?? 1);
  });

  return child;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.pid) child.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start("vite-dev", "npm", ["run", "dev"]);
start("scheduler-worker", "npm", ["run", "scheduler:worker"]);
