import { createFileRoute } from "@tanstack/react-router";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import {
  querySchedulerJobs,
  rescheduleSchedulerJob,
} from "@/services/scheduler-operator.server";
import {
  cancelSchedulerJob,
  createSchedulerJob,
  listSchedulerJobs,
} from "@/services/scheduler-service.server";
import type { SchedulerJobPayload, SchedulerJobStatus, SchedulerJobType } from "@/types/scheduler";

function isSchedulerJobType(value: unknown): value is SchedulerJobType {
  return [
    "calendar_reminder",
    "daily_digest",
    "budget_check",
    "assistant_routine",
    "notification_test",
  ].includes(String(value));
}

function isSchedulerJobStatus(value: unknown): value is SchedulerJobStatus {
  return ["pending", "running", "completed", "failed", "cancelled"].includes(String(value));
}

export const Route = createFileRoute("/api/scheduler/jobs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("status");
        const type = url.searchParams.get("type");
        const sourceItemId = url.searchParams.get("sourceItemId");

        const jobs = status || type || sourceItemId
          ? await querySchedulerJobs({
              ...(isSchedulerJobStatus(status) ? { status } : {}),
              ...(isSchedulerJobType(type) ? { type } : {}),
              ...(sourceItemId ? { sourceItemId } : {}),
            })
          : await listSchedulerJobs();
        return json({ jobs });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body)) return badRequest("Body must be a JSON object");

        const type = body.type;
        const scheduledFor = typeof body.scheduledFor === "string" ? body.scheduledFor : "";
        const dedupeKey = typeof body.dedupeKey === "string" ? body.dedupeKey : undefined;
        const maxAttempts = typeof body.maxAttempts === "number" ? body.maxAttempts : undefined;
        const payload = body.payload;

        if (!isSchedulerJobType(type)) return badRequest("Invalid scheduler job type");
        if (!scheduledFor) return badRequest("scheduledFor is required");
        if (!isObject(payload)) return badRequest("payload is required and must be an object");

        const job = await createSchedulerJob({
          type,
          scheduledFor,
          dedupeKey,
          maxAttempts,
          payload: payload as SchedulerJobPayload,
        });

        return json({ job });
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body)) return badRequest("Body must be a JSON object");

        const id = typeof body.id === "string" ? body.id : "";
        const action = typeof body.action === "string" ? body.action : "";
        if (!id) {
          return badRequest("Expected { id, action }");
        }

        if (action === "cancel") {
          const job = await cancelSchedulerJob(id);
          return json({ job });
        }

        if (action === "reschedule") {
          const scheduledFor = typeof body.scheduledFor === "string" ? body.scheduledFor : "";
          if (!scheduledFor) return badRequest("scheduledFor is required for reschedule");
          const job = await rescheduleSchedulerJob(id, scheduledFor);
          return json({ job });
        }

        return badRequest("Expected action to be 'cancel' or 'reschedule'");
      },
    },
  },
});
