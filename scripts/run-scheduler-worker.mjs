import { spawn } from "node:child_process";

const controller = new AbortController();

process.on("SIGINT", () => controller.abort());
process.on("SIGTERM", () => controller.abort());

const DEFAULT_IDLE_POLL_MS = 60_000;
const MAX_SLEEP_MS = 5 * 60_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getNextDelayMs() {
  const { jobs } = await runJsonCli("scheduler:jobs");
  const nextPending = Array.isArray(jobs) ? jobs.find((job) => job.status === "pending") : null;
  if (!nextPending?.scheduledFor) return DEFAULT_IDLE_POLL_MS;
  const delay = new Date(nextPending.scheduledFor).getTime() - Date.now();
  return Math.max(0, Math.min(Number.isFinite(delay) ? delay : DEFAULT_IDLE_POLL_MS, MAX_SLEEP_MS));
}

async function runJsonCli(mode) {
  const script = mode === "scheduler:jobs"
    ? `import { listSchedulerJobs } from "../src/services/scheduler-service.server.ts"; console.log(JSON.stringify({ jobs: await listSchedulerJobs() }));`
    : `import { runDueSchedulerJobs } from "../src/services/scheduler-service.server.ts"; console.log(JSON.stringify(await runDueSchedulerJobs()));`;

  return await new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", "--tsconfig", "tsconfig.json", "--eval", script], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      signal: controller.signal,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `scheduler worker child exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim() || "{}"));
      } catch (error) {
        reject(error);
      }
    });
  });
}

console.log("[scheduler-worker] starting");

while (!controller.signal.aborted) {
  const result = await runJsonCli("scheduler:run");
  if (result.processed > 0) {
    console.log(`[scheduler-worker] processed=${result.processed} completed=${result.completed} failed=${result.failed} wakeEvents=${result.wakeEvents}`);
  }
  if (controller.signal.aborted) break;
  const delayMs = await getNextDelayMs();
  await sleep(delayMs);
}

console.log("[scheduler-worker] stopped");
