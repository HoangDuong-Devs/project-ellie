export type NotificationKind = "info" | "warn" | "danger" | "success";

export type NotificationCategory = "calendar" | "finance" | "goal" | "focus" | "system";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
  dedupeKey?: string;
}

export interface NotificationPrefs {
  calendar: boolean;
  finance: boolean;
  goal: boolean;
  focus: boolean;
  system: boolean;
  dailyDigest: boolean;
  reminderRepeatEnabled: boolean;
  reminderRepeatIntervalMinutes: number;
  reminderRepeatMaxTimes: number;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  calendar: true,
  finance: true,
  goal: true,
  focus: true,
  system: true,
  dailyDigest: true,
  reminderRepeatEnabled: true,
  reminderRepeatIntervalMinutes: 5,
  reminderRepeatMaxTimes: 3,
};
