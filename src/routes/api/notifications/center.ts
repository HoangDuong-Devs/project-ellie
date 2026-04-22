import { createFileRoute } from "@tanstack/react-router";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import {
  clearStoredNotifications,
  createStoredNotification,
  deleteStoredNotification,
  listStoredNotifications,
  patchStoredNotification,
} from "@/services/notification-center.server";
import {
  cancelSchedulerJob,
  createSchedulerJob,
} from "@/services/scheduler-service.server";
import type { NotificationCategory, NotificationKind } from "@/types/notifications";

function isCategory(value: unknown): value is NotificationCategory {
  return ["calendar", "finance", "goal", "focus", "system"].includes(String(value));
}

function isKind(value: unknown): value is NotificationKind {
  return ["info", "warn", "danger", "success"].includes(String(value));
}

export const Route = createFileRoute("/api/notifications/center")({
  server: {
    handlers: {
      GET: async () => {
        const items = await listStoredNotifications();
        return json({ items });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body)) return badRequest("Body must be a JSON object");

        const title = typeof body.title === "string" ? body.title.trim() : "";
        const textBody = typeof body.body === "string" ? body.body : "";
        const category = body.category;
        const kind = body.kind ?? "info";
        const dedupeKey = typeof body.dedupeKey === "string" ? body.dedupeKey : undefined;

        if (!title) return badRequest("title is required");
        if (!isCategory(category)) return badRequest("Invalid notification category");
        if (!isKind(kind)) return badRequest("Invalid notification kind");

        return json(
          await createStoredNotification({
            title,
            body: textBody,
            category,
            kind,
            dedupeKey,
          }),
        );
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body)) return badRequest("Body must be a JSON object");

        const items = await listStoredNotifications();

        if (body.markAllRead === true) {
          for (const item of items) {
            await patchStoredNotification(item.id, { read: true });
          }
          const next = await listStoredNotifications();
          return json({ items: next });
        }

        const id = typeof body.id === "string" ? body.id : null;
        const action = typeof body.action === "string" ? body.action : undefined;
        if (!id) return badRequest("Expected { id } or { markAllRead: true }");

        const notification = items.find((item) => item.id === id);
        if (!notification) return json({ error: "Notification not found" }, { status: 404 });

        if (action === "snooze") {
          const minutes = typeof body.minutes === "number" && body.minutes > 0 ? body.minutes : 10;
          const schedulerJobId =
            typeof notification.metadata?.schedulerJobId === "string"
              ? notification.metadata.schedulerJobId
              : undefined;
          if (schedulerJobId) await cancelSchedulerJob(schedulerJobId);
          await createSchedulerJob({
            type: "notification_test",
            scheduledFor: new Date(Date.now() + minutes * 60_000).toISOString(),
            dedupeKey: notification.dedupeKey ? `${notification.dedupeKey}:snooze:${minutes}` : undefined,
            payload: {
              title: notification.title,
              body: notification.body,
              category: notification.category === "calendar" ? "system" : notification.category,
              kind: notification.kind,
            },
          });
        }

        return json(await patchStoredNotification(id, { read: true }));
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body)) return badRequest("Body must be a JSON object");

        if (body.clearAll === true) {
          return json(await clearStoredNotifications());
        }

        const id = typeof body.id === "string" ? body.id : null;
        const action = typeof body.action === "string" ? body.action : undefined;
        if (!id) return badRequest("Expected { id } or { clearAll: true }");

        const items = await listStoredNotifications();
        const notification = items.find((item) => item.id === id);
        if (!notification) return json({ error: "Notification not found" }, { status: 404 });

        if (action === "dismiss") {
          const schedulerJobId =
            typeof notification.metadata?.schedulerJobId === "string"
              ? notification.metadata.schedulerJobId
              : undefined;
          if (schedulerJobId) await cancelSchedulerJob(schedulerJobId);
        }

        return json(await deleteStoredNotification(id));
      },
    },
  },
});
