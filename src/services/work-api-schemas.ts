import { z } from "zod";

export const idSchema = z.string().min(1);

export const columnCreateSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
});

export const columnPatchSchema = z.object({
  id: idSchema,
  patch: z
    .object({
      name: z.string().min(1).optional(),
      order: z.number().int().nonnegative().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const labelCreateSchema = z.object({
  name: z.string().min(1),
  color: z.enum(["pink", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "gray"]),
});

export const labelPatchSchema = z.object({
  id: idSchema,
  patch: z
    .object({
      name: z.string().min(1).optional(),
      color: z.enum(["pink", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "gray"]).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const sprintCreateSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  goal: z.string().optional(),
});

export const sprintPatchSchema = z.object({
  id: idSchema,
  patch: z
    .object({
      name: z.string().min(1).optional(),
      goal: z.string().optional(),
      state: z.enum(["planned", "active", "completed"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const moveCardSchema = z.object({
  cardId: z.string().min(1),
  targetColumnId: z.string().min(1),
  targetIndex: z.number().int().nonnegative(),
});

export const cardActionSchema = z.object({
  cardId: z.string().min(1),
  action: z.enum(["assign", "unassign", "archive", "unarchive", "duplicate", "set-sprint"]),
  assignee: z.string().optional(),
  sprintId: z.string().nullable().optional(),
});
