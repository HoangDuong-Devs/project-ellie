import "@tanstack/react-start/server-only";
import { parseLocal, ymd, ymdhm } from "@/lib/calendar";
import { upsertCalendarItem } from "@/services/calendar-service";
import type { CalendarItem } from "@/types/calendar";

export function moveCalendarItem(item: CalendarItem, targetStartISO: string, targetEndISO?: string) {
  const start = parseLocal(item.startISO);
  const end = parseLocal(item.endISO);
  const duration = end.getTime() - start.getTime();
  const targetStart = parseLocal(targetStartISO);
  const targetEnd = targetEndISO ? parseLocal(targetEndISO) : new Date(targetStart.getTime() + duration);

  return {
    ...item,
    startISO: ymdhm(targetStart),
    endISO: ymdhm(targetEnd),
  } satisfies CalendarItem;
}

export function duplicateCalendarItem(item: CalendarItem) {
  return {
    ...item,
    id: crypto.randomUUID(),
    title: `${item.title} (copy)`,
    createdAt: new Date().toISOString(),
  } satisfies CalendarItem;
}

export function markCalendarOccurrence(
  item: CalendarItem,
  dateISO: string,
  field: "cancelledDates" | "completedDates",
) {
  const current = new Set(item[field] ?? []);
  current.add(dateISO);
  return {
    ...item,
    [field]: Array.from(current).sort(),
  } satisfies CalendarItem;
}

export function replaceCalendarItem(items: CalendarItem[], item: CalendarItem) {
  return upsertCalendarItem(items, item);
}

export function resolveOccurrenceDate(item: CalendarItem, targetDateISO?: string) {
  return targetDateISO ?? ymd(parseLocal(item.startISO));
}
