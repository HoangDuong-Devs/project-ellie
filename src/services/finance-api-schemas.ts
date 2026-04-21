import { z } from "zod";

export const txTypeSchema = z.enum(["income", "expense"]);

export const transactionCreateSchema = z.object({
  type: txTypeSchema,
  amount: z.number().positive(),
  category: z.string().min(1),
  note: z.string().optional(),
  date: z.string().min(1),
});

export const transactionPatchSchema = z.object({
  id: z.string().min(1),
  patch: z
    .object({
      type: txTypeSchema.optional(),
      amount: z.number().positive().optional(),
      category: z.string().min(1).optional(),
      note: z.string().optional(),
      date: z.string().min(1).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const idPayloadSchema = z.object({
  id: z.string().min(1),
});

export const financeSummaryQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(0).max(11).optional(),
});

export const monthlyBudgetSchema = z.object({
  total: z.number().nonnegative(),
  categories: z.record(z.string(), z.number().nonnegative()),
});

export const monthlyBudgetQuerySchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(0).max(11),
});

export const monthlyBudgetPayloadSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(0).max(11),
  budget: monthlyBudgetSchema,
});
