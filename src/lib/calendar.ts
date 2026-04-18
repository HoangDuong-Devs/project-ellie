import type { CalendarColor, CalendarItem, RecurrenceFreq } from "@/types/calendar";

export const COLORS: Record<CalendarColor, { dot: string; bg: string; ring: string; text: string; soft: string }> = {
  pink:   { dot: "bg-pink-500",    bg: "bg-pink-500",    ring: "ring-pink-300",    text: "text-pink-700",    soft: "bg-pink-100 text-pink-800 border-pink-200" },
  red:    { dot: "bg-rose-500",    bg: "bg-rose-500",    ring: "ring-rose-300",    text: "text-rose-700",    soft: "bg-rose-100 text-rose-800 border-rose-200" },
  orange: { dot: "bg-orange-500",  bg: "bg-orange-500",  ring: "ring-orange-300",  text: "text-orange-700",  soft: "bg-orange-100 text-orange-800 border-orange-200" },
  yellow: { dot: "bg-amber-500",   bg: "bg-amber-500",   ring: "ring-amber-300",   text: "text-amber-700",   soft: "bg-amber-100 text-amber-900 border-amber-200" },
  green:  { dot: "bg-emerald-500", bg: "bg-emerald-500", ring: "ring-emerald-300", text: "text-emerald-700", soft: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cyan:   { dot: "bg-cyan-500",    bg: "bg-cyan-500",    ring: "ring-cyan-300",    text: "text-cyan-700",    soft: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  blue:   { dot: "bg-blue-500",    bg: "bg-blue-500",    ring: "ring-blue-300",    text: "text-blue-700",    soft: "bg-blue-100 text-blue-800 border-blue-200" },
  purple: { dot: "bg-violet-500",  bg: "bg-violet-500",  ring: "ring-violet-300",  text: "text-violet-700",  soft: "bg-violet-100 text-violet-800 border-violet-200" },
};

export const COLOR_KEYS: CalendarColor[] = ["pink", "red", "orange", "yellow", "green", "cyan", "blue", "purple"];

export const RECURRENCE_LABELS: Record<RecurrenceFreq, string> = {
  none: "Không lặp",
  daily: "Hằng ngày",
  weekly: "Hằng tuần",
  monthly: "Hằng tháng",
  yearly: "Hằng năm",
};

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Không nhắc" },
  { value: 0, label: "Đúng giờ" },
  { value: 5, label: "5 phút trước" },
  { value: 10, label: "10 phút trước" },
  { value: 15, label: "15 phút trước" },
  { value: 30, label: "30 phút trước" },
  { value: 60, label: "1 giờ trước" },
];

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ymdhm(d: Date) {
  return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseLocal(iso: string) {
  // Treat YYYY-MM-DDTHH:mm as local time
  const [date, time = "00:00"] = iso.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0, 0);
}

export function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Expand recurring items into concrete occurrences within [rangeStart, rangeEnd].
 * Each occurrence keeps the original `id` but gets `instanceISO` for unique key.
 */
export interface CalendarOccurrence extends CalendarItem {
  instanceStart: Date;
  instanceEnd: Date;
  instanceKey: string;
}

export function expandOccurrences(
  items: CalendarItem[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarOccurrence[] {
  const out: CalendarOccurrence[] = [];
  for (const it of items) {
    const start = parseLocal(it.startISO);
    const end = parseLocal(it.endISO);
    const dur = end.getTime() - start.getTime();
    const until = it.recurrenceUntil ? parseLocal(it.recurrenceUntil + "T23:59") : null;

    const push = (s: Date) => {
      const e = new Date(s.getTime() + dur);
      if (e < rangeStart || s > rangeEnd) return;
      out.push({
        ...it,
        instanceStart: s,
        instanceEnd: e,
        instanceKey: `${it.id}@${s.getTime()}`,
      });
    };

    if (it.recurrence === "none") {
      push(start);
      continue;
    }

    // Cap iterations to avoid infinite loops
    let cur = new Date(start);
    let i = 0;
    const limit = 1500;
    while (cur <= rangeEnd && i < limit) {
      if (until && cur > until) break;
      push(new Date(cur));
      i++;
      switch (it.recurrence) {
        case "daily":
          cur.setDate(cur.getDate() + 1);
          break;
        case "weekly":
          cur.setDate(cur.getDate() + 7);
          break;
        case "monthly":
          cur.setMonth(cur.getMonth() + 1);
          break;
        case "yearly":
          cur.setFullYear(cur.getFullYear() + 1);
          break;
      }
    }
  }
  return out;
}

export function fmtTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtRange(s: Date, e: Date) {
  return `${fmtTime(s)} – ${fmtTime(e)}`;
}

export function migrateLegacyEvents(legacy: { id: string; date: string; title: string; note?: string }[], calendarId: string): CalendarItem[] {
  return legacy.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.note,
    startISO: `${l.date}T00:00`,
    endISO: `${l.date}T23:59`,
    allDay: true,
    calendarId,
    recurrence: "none",
    createdAt: new Date().toISOString(),
  }));
}
