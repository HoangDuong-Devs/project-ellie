import "@tanstack/react-start/server-only";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import type { AppNotification, NotificationCategory, NotificationKind } from "@/types/notifications";

const MAX_KEEP = 200;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimItems(items: AppNotification[]) {
  return items.slice(0, MAX_KEEP);
}

export async function listStoredNotifications() {
  return await getOrInitValue<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
}

export async function createStoredNotification(input: {
  title: string;
  body?: string;
  category: NotificationCategory;
  kind?: NotificationKind;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
}) {
  const items = await listStoredNotifications();
  if (input.dedupeKey && items.some((item) => item.dedupeKey === input.dedupeKey)) {
    return {
      item: items.find((item) => item.dedupeKey === input.dedupeKey) ?? null,
      items,
      created: false,
    };
  }

  const item: AppNotification = {
    id: uid(),
    title: input.title,
    body: input.body ?? "",
    category: input.category,
    kind: input.kind ?? "info",
    dedupeKey: input.dedupeKey,
    createdAt: new Date().toISOString(),
    read: false,
    metadata: input.metadata,
  };

  const next = trimItems([item, ...items]);
  await setValue(STORAGE_KEYS.NOTIFICATIONS, next);
  return { item, items: next, created: true };
}

export async function patchStoredNotification(id: string, patch: Partial<AppNotification>) {
  const items = await listStoredNotifications();
  const next = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  await setValue(STORAGE_KEYS.NOTIFICATIONS, next);
  return { item: next.find((item) => item.id === id) ?? null, items: next };
}

export async function deleteStoredNotification(id: string) {
  const items = await listStoredNotifications();
  const next = items.filter((item) => item.id !== id);
  await setValue(STORAGE_KEYS.NOTIFICATIONS, next);
  return { items: next };
}

export async function clearStoredNotifications() {
  await setValue(STORAGE_KEYS.NOTIFICATIONS, []);
  return { items: [] as AppNotification[] };
}
