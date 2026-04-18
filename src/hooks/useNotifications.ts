import { useEffect, useRef } from "react";
import type { CalendarItem } from "@/types/calendar";
import { getReminderOffsets, parseLocal } from "@/lib/calendar";

/**
 * Background scheduler: every 30s scan upcoming items, fire one notification
 * per reminder offset when its window crosses "now". Tracks fired keys to
 * prevent duplicates within the session.
 */
export function useReminderScheduler(items: CalendarItem[]) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    function tick() {
      if (Notification.permission !== "granted") return;
      const now = Date.now();
      for (const it of items) {
        const offsets = getReminderOffsets(it);
        if (offsets.length === 0) continue;
        const start = parseLocal(it.startISO).getTime();
        for (const off of offsets) {
          const fireAt = start - off * 60_000;
          const key = `${it.id}@${fireAt}`;
          if (firedRef.current.has(key)) continue;
          if (now >= fireAt && now <= fireAt + 60_000) {
            try {
              const body =
                off === 0
                  ? it.description || "Sự kiện bắt đầu ngay bây giờ"
                  : `Bắt đầu trong ${off < 60 ? `${off} phút` : off < 1440 ? `${Math.round(off / 60)} giờ` : `${Math.round(off / 1440)} ngày`}`;
              new Notification(it.title, { body, tag: key });
              firedRef.current.add(key);
            } catch {
              /* ignore */
            }
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
