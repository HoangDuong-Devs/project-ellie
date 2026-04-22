import "@tanstack/react-start/server-only";
import {
  cancelSchedulerJob,
  createSchedulerJob,
  listSchedulerJobs,
} from "@/services/scheduler-service.server";
import { getReminderOffsets, parseLocal } from "@/lib/calendar";
import type { CalendarItem } from "@/types/calendar";

function buildReminderDedupeKey(itemId: string, fireAtIso: string) {
  return `calendar-reminder:${itemId}:${fireAtIso}`;
}

function buildReminderPrefix(itemId: string) {
  return `calendar-reminder:${itemId}:`;
}

export async function syncCalendarReminderJobs(item: CalendarItem) {
  const offsets = getReminderOffsets(item);
  const allJobs = await listSchedulerJobs();
  const activeDedupeKeys = new Set<string>();
  const reminderPrefix = buildReminderPrefix(item.id);

  for (const offset of offsets) {
    const fireAt = new Date(parseLocal(item.startISO).getTime() - offset * 60_000);
    const fireAtIso = fireAt.toISOString();
    const dedupeKey = buildReminderDedupeKey(item.id, fireAtIso);
    activeDedupeKeys.add(dedupeKey);

    if (allJobs.some((job) => job.dedupeKey === dedupeKey && job.status !== "cancelled")) {
      continue;
    }

    const body =
      offset === 0
        ? item.description || "Sự kiện bắt đầu ngay bây giờ"
        : `${item.description ? `${item.description} · ` : ""}Bắt đầu trong ${formatOffset(offset)}`;

    await createSchedulerJob({
      type: "calendar_reminder",
      scheduledFor: fireAtIso,
      dedupeKey,
      payload: {
        title: item.title,
        body,
        category: "calendar",
        kind: "info",
        sourceItemId: item.id,
      },
    });
  }

  const staleJobs = allJobs.filter(
    (job) =>
      job.dedupeKey?.startsWith(reminderPrefix) &&
      !activeDedupeKeys.has(job.dedupeKey) &&
      (job.status === "pending" || job.status === "running"),
  );

  for (const job of staleJobs) {
    await cancelSchedulerJob(job.id);
  }

  return {
    createdForOffsets: offsets,
    activeDedupeKeys: Array.from(activeDedupeKeys),
    cancelledJobs: staleJobs.map((job) => job.id),
  };
}

export async function cancelCalendarReminderJobs(itemId: string) {
  const jobs = await listSchedulerJobs();
  const reminderPrefix = buildReminderPrefix(itemId);
  const cancelled: string[] = [];

  for (const job of jobs) {
    if (
      job.dedupeKey?.startsWith(reminderPrefix) &&
      (job.status === "pending" || job.status === "running")
    ) {
      await cancelSchedulerJob(job.id);
      cancelled.push(job.id);
    }
  }

  return { cancelled };
}

function formatOffset(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} giờ`;
  return `${Math.round(minutes / 1440)} ngày`;
}
