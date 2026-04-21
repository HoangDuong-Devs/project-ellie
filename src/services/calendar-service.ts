import type { Calendar as CalendarType, CalendarItem } from "@/types/calendar";

export const DEFAULT_CALENDARS: CalendarType[] = [
  { id: "personal", name: "Cá nhân", color: "pink", visible: true },
  { id: "work", name: "Công việc", color: "cyan", visible: true },
  { id: "study", name: "Học tập", color: "purple", visible: true },
  { id: "birthday", name: "Sinh nhật & Lễ", color: "orange", visible: true },
];

export function upsertCalendarItem(items: CalendarItem[], item: CalendarItem): CalendarItem[] {
  const exists = items.some((it) => it.id === item.id);
  if (!exists) return [item, ...items];
  return items.map((it) => (it.id === item.id ? item : it));
}

export function removeCalendarItem(items: CalendarItem[], id: string): CalendarItem[] {
  return items.filter((it) => it.id !== id);
}
