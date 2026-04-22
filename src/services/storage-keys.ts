export const STORAGE_KEYS = {
  CALENDARS: "ellie:calendars",
  CALENDAR_ITEMS: "ellie:calendar-items",
  TODOS: "ellie:todos",
  GOALS: "ellie:goals",
  FOCUS_SETTINGS: "ellie:focus-settings",
  POMODOROS: "ellie:pomodoros",
  TRANSACTIONS: "ellie:transactions",
  SAVINGS_GOALS: "ellie:savings-goals",
  MONTHLY_BUDGET: "ellie:monthly-budget",
  WORK: "ellie:work:v1",
  NOTIFICATIONS: "ellie:notifications",
  NOTIFICATION_PREFS: "ellie:notification-prefs",
  SCHEDULER_JOBS: "ellie:scheduler-jobs",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
