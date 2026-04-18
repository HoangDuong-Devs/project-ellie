export type Priority = "high" | "medium" | "low";

export interface Todo {
  id: string;
  title: string;
  priority: Priority;
  dueDate?: string;
  done: boolean;
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  day: number; // 0 = Mon, 6 = Sun
  startHour: number; // 0-23
  duration: number; // hours
  color?: string;
}
