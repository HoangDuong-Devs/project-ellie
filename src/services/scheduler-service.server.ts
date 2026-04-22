import "@tanstack/react-start/server-only";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { emitRuntimeWakeEvent } from "@/services/openclaw-runtime-event.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import type { AppNotification } from "@/types/notifications";
import type {
  SchedulerJob,
  SchedulerJobPayload,
  SchedulerRunResult,
  SchedulerJobStatus,
} from "@/types/scheduler";

const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60_000;

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isTerminalStatus(status: SchedulerJobStatus) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

async function readJobs() {
  return await getOrInitValue<SchedulerJob[]>(STORAGE_KEYS.SCHEDULER_JOBS, []);
}

async function writeJobs(jobs: SchedulerJob[]) {
  return await setValue(STORAGE_KEYS.SCHEDULER_JOBS, jobs);
}

async function readNotifications() {
  return await getOrInitValue<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
}

async function writeNotifications(items: AppNotification[]) {
  return await setValue(STORAGE_KEYS.NOTIFICATIONS, items);
}

function notificationFromJob(job: SchedulerJob): AppNotification {
  const payload = job.payload as SchedulerJobPayload & {
    title?: string;
    body?: string;
    category?: AppNotification["category"];
    kind?: AppNotification["kind"];
  };

  return {
    id: uid("notif"),
    title: payload.title ?? `Scheduler job: ${job.type}`,
    body: payload.body ?? `Executed scheduled job ${job.id}`,
    category: payload.category ?? "system",
    kind: payload.kind ?? "info",
    dedupeKey: job.dedupeKey,
    createdAt: nowIso(),
    read: false,
  };
}

export async function listSchedulerJobs() {
  const jobs = await readJobs();
  return jobs.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

export async function createSchedulerJob(input: {
  type: SchedulerJob["type"];
  scheduledFor: string;
  payload: SchedulerJobPayload;
  dedupeKey?: string;
  maxAttempts?: number;
}) {
  const jobs = await readJobs();
  if (input.dedupeKey && jobs.some((job) => job.dedupeKey === input.dedupeKey && !isTerminalStatus(job.status))) {
    return jobs.find((job) => job.dedupeKey === input.dedupeKey) ?? null;
  }

  const timestamp = nowIso();
  const job: SchedulerJob = {
    id: uid("job"),
    type: input.type,
    status: "pending",
    scheduledFor: input.scheduledFor,
    createdAt: timestamp,
    updatedAt: timestamp,
    attemptCount: 0,
    maxAttempts: Math.max(1, input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS),
    dedupeKey: input.dedupeKey,
    payload: input.payload,
  };

  await writeJobs([...jobs, job]);
  return job;
}

export async function cancelSchedulerJob(id: string) {
  const jobs = await readJobs();
  const timestamp = nowIso();
  const next = jobs.map((job) =>
    job.id === id && !isTerminalStatus(job.status)
      ? { ...job, status: "cancelled" as const, cancelledAt: timestamp, updatedAt: timestamp }
      : job,
  );
  await writeJobs(next);
  return next.find((job) => job.id === id) ?? null;
}

function buildWakeEventText(job: SchedulerJob) {
  const payload = job.payload as SchedulerJobPayload & {
    title?: string;
    body?: string;
  };
  return [
    `Scheduler due: ${job.type}`,
    `jobId=${job.id}`,
    payload.title ? `title=${payload.title}` : null,
    payload.body ? `body=${payload.body}` : null,
    job.dedupeKey ? `dedupeKey=${job.dedupeKey}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export async function runDueSchedulerJobs(now = new Date()): Promise<SchedulerRunResult> {
  const jobs = await readJobs();
  const notifications = await readNotifications();
  const nowAt = now.toISOString();
  const updatedJobs = [...jobs];
  const touched: SchedulerJob[] = [];
  const notificationItems = [...notifications];
  let completed = 0;
  let failed = 0;
  let wakeEvents = 0;

  for (let i = 0; i < updatedJobs.length; i += 1) {
    const job = updatedJobs[i];
    if (job.status !== "pending") continue;
    if (job.scheduledFor > nowAt) continue;

    const startedAt = nowIso();
    const runningJob: SchedulerJob = {
      ...job,
      status: "running",
      attemptCount: job.attemptCount + 1,
      lastRunAt: startedAt,
      updatedAt: startedAt,
    };
    updatedJobs[i] = runningJob;

    try {
      if (job.dedupeKey && notificationItems.some((item) => item.dedupeKey === job.dedupeKey)) {
        const done: SchedulerJob = {
          ...runningJob,
          status: "completed",
          completedAt: nowIso(),
          updatedAt: nowIso(),
        };
        updatedJobs[i] = done;
        touched.push(done);
        completed += 1;
        continue;
      }

      const notification = notificationFromJob(runningJob);
      notificationItems.unshift(notification);

      const wakeResult = await emitRuntimeWakeEvent(buildWakeEventText(runningJob));
      if (wakeResult.ok) wakeEvents += 1;

      const done: SchedulerJob = {
        ...runningJob,
        status: "completed",
        completedAt: nowIso(),
        updatedAt: nowIso(),
        error: undefined,
        nextAttemptAt: undefined,
      };
      updatedJobs[i] = done;
      touched.push(done);
      completed += 1;
    } catch (error) {
      const canRetry = runningJob.attemptCount < runningJob.maxAttempts;
      const failedJob: SchedulerJob = {
        ...runningJob,
        status: canRetry ? "pending" : "failed",
        failedAt: canRetry ? undefined : nowIso(),
        nextAttemptAt: canRetry ? new Date(Date.now() + RETRY_DELAY_MS).toISOString() : undefined,
        scheduledFor: canRetry ? new Date(Date.now() + RETRY_DELAY_MS).toISOString() : runningJob.scheduledFor,
        updatedAt: nowIso(),
        error: error instanceof Error ? error.message : "Unknown scheduler error",
      };
      updatedJobs[i] = failedJob;
      touched.push(failedJob);
      if (!canRetry) failed += 1;
    }
  }

  await writeJobs(updatedJobs);
  await writeNotifications(notificationItems.slice(0, 200));

  return {
    processed: touched.length,
    completed,
    failed,
    wakeEvents,
    now: nowAt,
    jobs: touched,
  };
}
