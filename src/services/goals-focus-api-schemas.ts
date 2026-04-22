import { z } from "zod";

export const goalStepSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  done: z.boolean().optional(),
});

export const goalSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  deadline: z.string().optional(),
  steps: z.array(goalStepSchema).optional(),
  completed: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export const goalPatchSchema = z.object({
  id: z.string().min(1),
  patch: goalSchema.partial().refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const idPayloadSchema = z.object({
  id: z.string().min(1),
});

export const focusSettingsSchema = z.object({
  workMinutes: z.number().int().min(1).max(240),
  breakMinutes: z.number().int().min(1).max(120),
});

export const focusSettingsPatchSchema = z.object({
  patch: z
    .object({
      workMinutes: z.number().int().min(1).max(240).optional(),
      breakMinutes: z.number().int().min(1).max(120).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const pomodoroSessionSchema = z.object({
  id: z.string().min(1).optional(),
  date: z.string().optional(),
  minutes: z.number().int().positive(),
});

export const pomodoroSessionPatchSchema = z.object({
  id: z.string().min(1),
  patch: z
    .object({
      date: z.string().optional(),
      minutes: z.number().int().positive().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const goalStepActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["add-step", "update-step", "remove-step"]),
  step: z
    .object({
      id: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      done: z.boolean().optional(),
    })
    .optional(),
  stepId: z.string().min(1).optional(),
});
