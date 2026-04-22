export type CalendarColor =
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple";

export type RecurrenceFreq = "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

// Mon=0, Tue=1, ..., Sun=6 (matches our week labels)
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RecurrenceRule {
  freq: Exclude<RecurrenceFreq, "none">;
  interval?: number; // every N units (default 1)
  byWeekDays?: WeekDay[]; // for weekly: which days
  monthlyMode?: "dayOfMonth" | "dayOfWeek"; // for monthly
  count?: number; // ends after N occurrences
  until?: string; // YYYY-MM-DD inclusive
}

export interface CalendarItem {
  id: string;
  title: string;
  description?: string;
  startISO: string; // YYYY-MM-DDTHH:mm (local)
  endISO: string;
  allDay: boolean;
  calendarId: string;
  color?: CalendarColor; // override calendar color
  recurrence: RecurrenceFreq;
  recurrenceRule?: RecurrenceRule; // detailed config
  recurrenceUntil?: string; // legacy quick-until
  reminderMinutes?: number; // legacy single reminder
  reminders?: number[]; // multiple reminder offsets in minutes
  cancelledDates?: string[];
  completedDates?: string[];
  createdAt: string;
}

export interface Calendar {
  id: string;
  name: string;
  color: CalendarColor;
  visible: boolean;
}

// Legacy type kept for one-shot migration
export interface LegacyCalendarEvent {
  id: string;
  date: string;
  title: string;
  note?: string;
  color?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  target: number;
  createdAt: string;
}
