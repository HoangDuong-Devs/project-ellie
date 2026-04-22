import { z } from "zod";

const calendarColorSchema = z.enum([
  "pink",
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
]);

const recurrenceFreqSchema = z.enum(["none", "daily", "weekly", "monthly", "yearly", "custom"]);

const weekDaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const recurrenceRuleSchema = z.object({
  freq: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  interval: z.number().int().positive().optional(),
  byWeekDays: z.array(weekDaySchema).optional(),
  monthlyMode: z.enum(["dayOfMonth", "dayOfWeek"]).optional(),
  count: z.number().int().positive().optional(),
  until: z.string().optional(),
});

export const calendarItemSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  startISO: z.string().min(1),
  endISO: z.string().min(1),
  allDay: z.boolean().default(false),
  calendarId: z.string().min(1),
  color: calendarColorSchema.optional(),
  recurrence: recurrenceFreqSchema.default("none"),
  recurrenceRule: recurrenceRuleSchema.optional(),
  recurrenceUntil: z.string().optional(),
  reminderMinutes: z.number().int().nonnegative().optional(),
  reminders: z.array(z.number().int().nonnegative()).optional(),
  cancelledDates: z.array(z.string().min(1)).optional(),
  completedDates: z.array(z.string().min(1)).optional(),
  createdAt: z.string().optional(),
});

export const calendarItemPatchSchema = z.object({
  id: z.string().min(1),
  patch: calendarItemSchema.partial().refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const calendarSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  color: calendarColorSchema,
  visible: z.boolean().optional(),
});

export const calendarPatchSchema = z.object({
  id: z.string().min(1),
  patch: calendarSchema
    .partial()
    .refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const todoSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]).optional(),
  dueDate: z.string().optional(),
  done: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export const todoPatchSchema = z.object({
  id: z.string().min(1),
  patch: todoSchema.partial().refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const idPayloadSchema = z.object({
  id: z.string().min(1),
});

export const calendarEventActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["move", "duplicate", "complete-occurrence", "cancel-occurrence"]),
  targetStartISO: z.string().optional(),
  targetEndISO: z.string().optional(),
  targetDateISO: z.string().optional(),
});
