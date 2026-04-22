export type SchedulerJobType =
  | "calendar_reminder"
  | "daily_digest"
  | "budget_check"
  | "assistant_routine"
  | "notification_test";

export type SchedulerJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface SchedulerJobBase {
  id: string;
  type: SchedulerJobType;
  status: SchedulerJobStatus;
  scheduledFor: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  nextAttemptAt?: string;
  attemptCount: number;
  maxAttempts: number;
  dedupeKey?: string;
  error?: string;
}

export interface CalendarReminderJobPayload {
  title: string;
  body: string;
  category: "calendar";
  kind?: "info" | "warn" | "danger" | "success";
  sourceItemId?: string;
}

export interface DailyDigestJobPayload {
  title: string;
  body: string;
  category: "calendar" | "system";
  kind?: "info" | "warn" | "danger" | "success";
  digestDate: string;
}

export interface BudgetCheckJobPayload {
  title: string;
  body: string;
  category: "finance";
  kind?: "info" | "warn" | "danger" | "success";
  monthKey: string;
}

export interface AssistantRoutineJobPayload {
  routineKey: string;
  title: string;
  body: string;
  category: "system";
  kind?: "info" | "warn" | "danger" | "success";
}

export interface NotificationTestJobPayload {
  title: string;
  body: string;
  category: "system";
  kind?: "info" | "warn" | "danger" | "success";
}

export type SchedulerJobPayload =
  | CalendarReminderJobPayload
  | DailyDigestJobPayload
  | BudgetCheckJobPayload
  | AssistantRoutineJobPayload
  | NotificationTestJobPayload;

export interface SchedulerJob extends SchedulerJobBase {
  payload: SchedulerJobPayload;
}

export interface SchedulerRunResult {
  processed: number;
  completed: number;
  failed: number;
  wakeEvents: number;
  now: string;
  jobs: SchedulerJob[];
}
