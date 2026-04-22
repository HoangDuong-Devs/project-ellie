import "@tanstack/react-start/server-only";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import type { SchedulerJob, SchedulerJobStatus, SchedulerJobType } from "@/types/scheduler";

async function readJobs() {
  return await getOrInitValue<SchedulerJob[]>(STORAGE_KEYS.SCHEDULER_JOBS, []);
}

async function writeJobs(jobs: SchedulerJob[]) {
  return await setValue(STORAGE_KEYS.SCHEDULER_JOBS, jobs);
}

export async function querySchedulerJobs(filters?: {
  status?: SchedulerJobStatus;
  type?: SchedulerJobType;
  sourceItemId?: string;
}) {
  const jobs = await readJobs();
  return jobs
    .filter((job) => {
      if (filters?.status && job.status !== filters.status) return false;
      if (filters?.type && job.type !== filters.type) return false;
      if (
        filters?.sourceItemId &&
        (!("sourceItemId" in job.payload) || job.payload.sourceItemId !== filters.sourceItemId)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

export async function rescheduleSchedulerJob(id: string, scheduledFor: string) {
  const jobs = await readJobs();
  const now = new Date().toISOString();
  const next = jobs.map((job) =>
    job.id === id
      ? {
          ...job,
          scheduledFor,
          updatedAt: now,
          status: "pending" as const,
          nextAttemptAt: undefined,
          completedAt: undefined,
          failedAt: undefined,
          cancelledAt: undefined,
          error: undefined,
        }
      : job,
  );
  await writeJobs(next);
  return next.find((job) => job.id === id) ?? null;
}
