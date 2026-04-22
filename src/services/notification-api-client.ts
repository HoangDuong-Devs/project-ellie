import { emitDataChanged } from "@/services/api-live-sync";
import type {
  AppNotification,
  NotificationCategory,
  NotificationKind,
  NotificationPrefs,
} from "@/types/notifications";

type NotificationsResponse = {
  items: AppNotification[];
  item?: AppNotification;
};

type NotificationPrefsResponse = {
  prefs: NotificationPrefs;
};

type PushNotificationInput = {
  title: string;
  body: string;
  category: NotificationCategory;
  kind?: NotificationKind;
  dedupeKey?: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || `Request failed: ${res.status}`);
  }
  return body as T;
}

export function listNotifications() {
  return request<NotificationsResponse>("/api/notifications/center");
}

export function createNotification(input: PushNotificationInput) {
  return request<NotificationsResponse>("/api/notifications/center", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((res) => {
    emitDataChanged("notifications");
    return res;
  });
}

export function markNotificationRead(id: string) {
  return request<NotificationsResponse>("/api/notifications/center", {
    method: "PATCH",
    body: JSON.stringify({ id, read: true }),
  }).then((res) => {
    emitDataChanged("notifications");
    return res;
  });
}

export function markAllNotificationsRead() {
  return request<NotificationsResponse>("/api/notifications/center", {
    method: "PATCH",
    body: JSON.stringify({ markAllRead: true }),
  }).then((res) => {
    emitDataChanged("notifications");
    return res;
  });
}

export function deleteNotification(id: string) {
  return request<NotificationsResponse>("/api/notifications/center", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("notifications");
    return res;
  });
}

export function clearNotifications() {
  return request<NotificationsResponse>("/api/notifications/center", {
    method: "DELETE",
    body: JSON.stringify({ clearAll: true }),
  }).then((res) => {
    emitDataChanged("notifications");
    return res;
  });
}

export function getNotificationPrefs() {
  return request<NotificationPrefsResponse>("/api/notifications/prefs");
}

export function patchNotificationPrefs(patch: Partial<NotificationPrefs>) {
  return request<NotificationPrefsResponse>("/api/notifications/prefs", {
    method: "PATCH",
    body: JSON.stringify({ patch }),
  }).then((res) => {
    emitDataChanged("notifications");
    return res;
  });
}

export function resetNotificationPrefs() {
  return request<NotificationPrefsResponse>("/api/notifications/prefs", {
    method: "POST",
  }).then((res) => {
    emitDataChanged("notifications");
    return res;
  });
}
