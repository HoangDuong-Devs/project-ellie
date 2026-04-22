import "@tanstack/react-start/server-only";
import { listSchedulerJobs, runDueSchedulerJobs } from "@/services/scheduler-service.server";

const DEFAULT_IDLE_POLL_MS = 60_000;
const MAX_SLEEP_MS = 5 * 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getNextSchedulerDelayMs(now = new Date()) {
  const jobs = await listSchedulerJobs();
  const nextPending = jobs.find((job) => job.status === "pending");
  if (!nextPending) return DEFAULT_IDLE_POLL_MS;

  const delay = new Date(nextPending.scheduledFor).getTime() - now.getTime();
  return Math.max(0, Math.min(Number.isFinite(delay) ? delay : DEFAULT_IDLE_POLL_MS, MAX_SLEEP_MS));
}

export async function runSchedulerLoop(options?: {
  signal?: AbortSignal;
  idlePollMs?: number;
  maxSleepMs?: number;
  onCycle?: (result: Awaited<ReturnType<typeof runDueSchedulerJobs>>) => void | Promise<void>;
}) {
  const idlePollMs = options?.idlePollMs ?? DEFAULT_IDLE_POLL_MS;
  const maxSleepMs = options?.maxSleepMs ?? MAX_SLEEP_MS;

  while (!options?.signal?.aborted) {
    const result = await runDueSchedulerJobs();
    await options?.onCycle?.(result);
    if (options?.signal?.aborted) break;

    const nextDelay = await getNextSchedulerDelayMs();
    const effectiveDelay = Math.max(0, Math.min(nextDelay || idlePollMs, maxSleepMs));
    await sleep(effectiveDelay);
  }
}
