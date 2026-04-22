import { createFileRoute } from "@tanstack/react-router";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import type { AppNotification, NotificationCategory, NotificationKind } from "@/types/notifications";

const MAX_KEEP = 200;

function isCategory(value: unknown): value is NotificationCategory {
  return ["calendar", "finance", "goal", "focus", "system"].includes(String(value));
}

function isKind(value: unknown): value is NotificationKind {
  return ["info", "warn", "danger", "success"].includes(String(value));
}

function trimItems(items: AppNotification[]) {
  return items.slice(0, MAX_KEEP);
}

export const Route = createFileRoute("/api/notifications/center")({
  server: {
    handlers: {
      GET: async () => {
        const items = await getOrInitValue<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
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

        const items = await getOrInitValue<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
        if (dedupeKey && items.some((x) => x.dedupeKey === dedupeKey)) {
          return json({ items });
        }

        const item: AppNotification = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          body: textBody,
          category,
          kind,
          dedupeKey,
          createdAt: new Date().toISOString(),
          read: false,
        };

        const next = trimItems([item, ...items]);
        await setValue(STORAGE_KEYS.NOTIFICATIONS, next);
        return json({ item, items: next });
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body)) return badRequest("Body must be a JSON object");

        const items = await getOrInitValue<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);

        if (body.markAllRead === true) {
          const next = items.map((i) => ({ ...i, read: true }));
          await setValue(STORAGE_KEYS.NOTIFICATIONS, next);
          return json({ items: next });
        }

        const id = typeof body.id === "string" ? body.id : null;
        if (!id) return badRequest("Expected { id } or { markAllRead: true }");

        const next = items.map((i) => (i.id === id ? { ...i, read: true } : i));
        await setValue(STORAGE_KEYS.NOTIFICATIONS, next);
        return json({ items: next });
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body)) return badRequest("Body must be a JSON object");

        if (body.clearAll === true) {
          await setValue(STORAGE_KEYS.NOTIFICATIONS, []);
          return json({ items: [] });
        }

        const id = typeof body.id === "string" ? body.id : null;
        if (!id) return badRequest("Expected { id } or { clearAll: true }");

        const items = await getOrInitValue<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
        const next = items.filter((i) => i.id !== id);
        await setValue(STORAGE_KEYS.NOTIFICATIONS, next);
        return json({ items: next });
      },
    },
  },
});
