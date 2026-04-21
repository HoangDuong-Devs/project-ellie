import { createFileRoute } from "@tanstack/react-router";
import { badRequest, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";
import { z } from "zod";
import type { SavingsGoal } from "@/types/calendar";

const savingsGoalCreateSchema = z.object({
  title: z.string().min(1),
  target: z.number().positive(),
});

const idSchema = z.object({ id: z.string().min(1) });

const savingsGoalPatchSchema = z.object({
  id: z.string().min(1),
  patch: z
    .object({
      title: z.string().min(1).optional(),
      target: z.number().positive().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "patch cannot be empty"),
});

export const Route = createFileRoute("/api/finance/savings-goals")({
  server: {
    handlers: {
      GET: async () => {
        const goals = await getOrInitValue<SavingsGoal[]>(STORAGE_KEYS.SAVINGS_GOALS, []);
        return json({ goals });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = savingsGoalCreateSchema.parse(body);
          const goals = await getOrInitValue<SavingsGoal[]>(STORAGE_KEYS.SAVINGS_GOALS, []);
          const goal: SavingsGoal = {
            id: crypto.randomUUID(),
            title: parsed.title,
            target: parsed.target,
            createdAt: new Date().toISOString(),
          };
          const next = [goal, ...goals];
          await setValue(STORAGE_KEYS.SAVINGS_GOALS, next);
          return json({ goal, goals: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid savings goal payload");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = savingsGoalPatchSchema.parse(body);
          const goals = await getOrInitValue<SavingsGoal[]>(STORAGE_KEYS.SAVINGS_GOALS, []);
          const next = goals.map((goal) =>
            goal.id === parsed.id ? { ...goal, ...parsed.patch } : goal,
          );
          await setValue(STORAGE_KEYS.SAVINGS_GOALS, next);
          return json({ goals: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id, patch }");
        }
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const { id } = idSchema.parse(body);
          const goals = await getOrInitValue<SavingsGoal[]>(STORAGE_KEYS.SAVINGS_GOALS, []);
          const next = goals.filter((goal) => goal.id !== id);
          await setValue(STORAGE_KEYS.SAVINGS_GOALS, next);
          return json({ goals: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id }");
        }
      },
    },
  },
});
