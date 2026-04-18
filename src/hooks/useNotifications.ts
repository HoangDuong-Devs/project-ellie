import { useEffect, useRef } from "react";
import type { CalendarItem } from "@/types/calendar";
import { parseLocal } from "@/lib/calendar";

/**
 * Background scheduler: every 30s scan upcoming items, fire browser
 * notification when reminder window crosses "now". Tracks fired ids in a
 * Set to avoid duplicates within the session.
 */
export function useReminderScheduler(items: CalendarItem[]) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    function tick() {
      if (Notification.permission !== "granted") return;
      const now = Date.now();
      for (const it of items) {
        if (it.reminderMinutes == null) continue;
        const start = parseLocal(it.startISO).getTime();
        const fireAt = start - it.reminderMinutes * 60_000;
        const key = `${it.id}@${fireAt}`;
        if (firedRef.current.has(key)) continue;
        // Fire if we're within a 60s window after fireAt and before start
        if (now >= fireAt && now <= start + 60_000) {
          try {
            new Notification(it.title, {
              body: it.description || "Sự kiện sắp bắt đầu",
              tag: key,
            });
            firedRef.current.add(key);
          } catch {
            /* ignore */
          }
        }
      }
    }

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [items]);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}
