export type CalendarColor =
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple";

export type RecurrenceFreq = "none" | "daily" | "weekly" | "monthly" | "yearly";

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
  recurrenceUntil?: string; // YYYY-MM-DD
  reminderMinutes?: number; // null/undefined = no reminder
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
