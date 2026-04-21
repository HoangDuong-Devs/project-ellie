import { useCallback, useEffect, useState } from "react";

export type NotificationKind = "info" | "warn" | "danger" | "success";
export type NotificationCategory =
  | "calendar"
  | "finance"
  | "goal"
  | "focus"
  | "system";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
  /** Optional dedupe key — duplicate inserts with same dedupeKey are ignored. */
  dedupeKey?: string;
}

const STORAGE_KEY = "ellie:notifications";
const MAX_KEEP = 200;
const EVENT = "ellie:notifications:update";

function readAll(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_KEEP)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

/** Append a notification to the persistent center (cross-component safe). */
export function pushNotification(n: Omit<AppNotification, "id" | "createdAt" | "read">) {
  const all = readAll();
  if (n.dedupeKey && all.some((x) => x.dedupeKey === n.dedupeKey)) return;
  const next: AppNotification = {
    ...n,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  writeAll([next, ...all]);
}

/** Hook for the bell UI — subscribes to updates from any tab/component. */
export function useNotificationCenter() {
  const [items, setItems] = useState<AppNotification[]>(() => readAll());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setItems(readAll());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) refresh();
    });
    return () => {
      window.removeEventListener(EVENT, refresh);
    };
  }, []);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = useCallback(() => {
    writeAll(readAll().map((i) => ({ ...i, read: true })));
  }, []);
  const markRead = useCallback((id: string) => {
    writeAll(readAll().map((i) => (i.id === id ? { ...i, read: true } : i)));
  }, []);
  const remove = useCallback((id: string) => {
    writeAll(readAll().filter((i) => i.id !== id));
  }, []);
  const clearAll = useCallback(() => {
    writeAll([]);
  }, []);

  return { items, unread, markAllRead, markRead, remove, clearAll };
}
