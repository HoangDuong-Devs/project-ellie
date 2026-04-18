import type { CalendarColor, CalendarItem, RecurrenceFreq, RecurrenceRule, WeekDay } from "@/types/calendar";

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
  custom: "Tuỳ chỉnh…",
};

export const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
export const WEEKDAY_LONG = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"] as const;

export const REMINDER_PRESETS: { value: number; label: string }[] = [
  { value: 0, label: "Đúng giờ" },
  { value: 5, label: "5 phút trước" },
  { value: 10, label: "10 phút trước" },
  { value: 15, label: "15 phút trước" },
  { value: 30, label: "30 phút trước" },
  { value: 60, label: "1 giờ trước" },
  { value: 120, label: "2 giờ trước" },
  { value: 1440, label: "1 ngày trước" },
];

// Legacy single-select (kept for backward compat)
export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Không nhắc" },
  ...REMINDER_PRESETS,
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

/** Convert JS getDay() (Sun=0..Sat=6) to our WeekDay (Mon=0..Sun=6). */
export function jsDayToWeekDay(jsDay: number): WeekDay {
  return ((jsDay + 6) % 7) as WeekDay;
}

/** Reminder offsets for an item (legacy single + new multi). */
export function getReminderOffsets(it: CalendarItem): number[] {
  const set = new Set<number>();
  if (it.reminderMinutes != null) set.add(it.reminderMinutes);
  it.reminders?.forEach((r) => set.add(r));
  return Array.from(set).sort((a, b) => b - a);
}

/** Build a normalized RecurrenceRule from item (handles legacy fields). */
function getRule(it: CalendarItem): RecurrenceRule | null {
  if (it.recurrence === "none") return null;
  if (it.recurrenceRule) {
    return { ...it.recurrenceRule, until: it.recurrenceRule.until ?? it.recurrenceUntil };
  }
  if (it.recurrence === "custom") return null;
  return { freq: it.recurrence, interval: 1, until: it.recurrenceUntil };
}

export interface CalendarOccurrence extends CalendarItem {
  instanceStart: Date;
  instanceEnd: Date;
  instanceKey: string;
}

/**
 * Expand recurring items into concrete occurrences within [rangeStart, rangeEnd].
 * Supports interval, byWeekDays (weekly), monthlyMode, count, until.
 */
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
    const rule = getRule(it);
    const until = rule?.until ? parseLocal(rule.until + "T23:59") : null;
    const interval = Math.max(1, rule?.interval ?? 1);

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

    if (!rule) {
      push(start);
      continue;
    }

    let count = 0;
    const maxCount = rule.count ?? Infinity;
    const limit = 2000;
    let iter = 0;

    if (rule.freq === "weekly" && rule.byWeekDays && rule.byWeekDays.length > 0) {
      const weekStart = startOfWeek(start);
      let curWeek = new Date(weekStart);
      while (curWeek <= rangeEnd && count < maxCount && iter < limit) {
        if (until && curWeek > until) break;
        for (const wd of [...rule.byWeekDays].sort()) {
          const occ = addDays(curWeek, wd);
          occ.setHours(start.getHours(), start.getMinutes(), 0, 0);
          if (occ < start) continue;
          if (until && occ > until) break;
          if (count >= maxCount) break;
          push(occ);
          count++;
        }
        curWeek = addDays(curWeek, 7 * interval);
        iter++;
      }
      continue;
    }

    let cur = new Date(start);
    while (cur <= rangeEnd && count < maxCount && iter < limit) {
      if (until && cur > until) break;
      push(new Date(cur));
      count++;
      iter++;
      switch (rule.freq) {
        case "daily":
          cur.setDate(cur.getDate() + interval);
          break;
        case "weekly":
          cur.setDate(cur.getDate() + 7 * interval);
          break;
        case "monthly":
          if (rule.monthlyMode === "dayOfWeek") {
            const wd = start.getDay();
            const nth = Math.ceil(start.getDate() / 7);
            cur.setMonth(cur.getMonth() + interval, 1);
            const firstWd = cur.getDay();
            let day = 1 + ((wd - firstWd + 7) % 7) + (nth - 1) * 7;
            const dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
            if (day > dim) day -= 7;
            cur.setDate(day);
          } else {
            cur.setMonth(cur.getMonth() + interval);
          }
          break;
        case "yearly":
          cur.setFullYear(cur.getFullYear() + interval);
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

export function describeRecurrence(it: CalendarItem): string {
  const rule = getRule(it);
  if (!rule) return "Không lặp";
  const interval = rule.interval ?? 1;
  let base = "";
  switch (rule.freq) {
    case "daily":
      base = interval === 1 ? "Hằng ngày" : `Mỗi ${interval} ngày`;
      break;
    case "weekly":
      if (rule.byWeekDays && rule.byWeekDays.length) {
        const days = [...rule.byWeekDays].sort().map((d) => WEEKDAY_SHORT[d]).join(", ");
        base = interval === 1 ? `Hằng tuần (${days})` : `Mỗi ${interval} tuần (${days})`;
      } else {
        base = interval === 1 ? "Hằng tuần" : `Mỗi ${interval} tuần`;
      }
      break;
    case "monthly":
      base = interval === 1 ? "Hằng tháng" : `Mỗi ${interval} tháng`;
      if (rule.monthlyMode === "dayOfWeek") base += " (cùng thứ)";
      break;
    case "yearly":
      base = interval === 1 ? "Hằng năm" : `Mỗi ${interval} năm`;
      break;
  }
  if (rule.count) base += ` · ${rule.count} lần`;
  else if (rule.until) base += ` · đến ${rule.until.split("-").reverse().join("/")}`;
  return base;
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
