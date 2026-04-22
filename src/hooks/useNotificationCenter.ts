import { useCallback, useEffect, useState } from "react";
import {
  clearNotifications,
  createNotification,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notification-api-client";
import { useDataAutoRefresh } from "@/services/api-live-sync";
import type {
  AppNotification,
  NotificationCategory,
  NotificationKind,
} from "@/types/notifications";

/** Append a notification to the persistent center (cross-component safe). */
export function pushNotification(n: Omit<AppNotification, "id" | "createdAt" | "read">) {
  void createNotification(n).catch(() => {
    /* ignore */
  });
}

/** Hook for the bell UI — subscribes to updates from any tab/component. */
export function useNotificationCenter() {
  const [items, setItems] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    const res = await listNotifications();
    setItems(res.items);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await listNotifications();
        if (!active) return;
        setItems(res.items);
      } catch {
        if (!active) return;
        setItems([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useDataAutoRefresh(refresh, "notifications");

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = useCallback(async () => {
    try {
      const res = await markAllNotificationsRead();
      setItems(res.items);
    } catch {
      // ignore
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      const res = await markNotificationRead(id);
      setItems(res.items);
    } catch {
      // ignore
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      const res = await deleteNotification(id);
      setItems(res.items);
    } catch {
      // ignore
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      const res = await clearNotifications();
      setItems(res.items);
    } catch {
      // ignore
    }
  }, []);

  return { items, unread, markAllRead, markRead, remove, clearAll };
}

export type { AppNotification, NotificationCategory, NotificationKind };
