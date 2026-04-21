import { createFileRoute } from "@tanstack/react-router";
import { badRequest, json, safeJson } from "@/services/api-utils";
import {
  goalPatchSchema,
  goalSchema,
  idPayloadSchema,
} from "@/services/goals-focus-api-schemas";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";
import type { Goal } from "@/types/goals";

function normalizeGoal(input: ReturnType<typeof goalSchema.parse>): Goal {
  return {
    id: input.id ?? crypto.randomUUID(),
    title: input.title,
    description: input.description,
    deadline: input.deadline,
    steps: (input.steps ?? []).map((step) => ({
      id: step.id ?? crypto.randomUUID(),
      title: step.title,
      done: step.done ?? false,
    })),
    completed:
      input.completed ??
      ((input.steps ?? []).length > 0
        ? (input.steps ?? []).every((s) => s.done ?? false)
        : false),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export const Route = createFileRoute("/api/goals")({
  server: {
    handlers: {
      GET: async () => {
        const goals = await getOrInitValue<Goal[]>(STORAGE_KEYS.GOALS, []);
        return json({ goals });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = goalSchema.parse(body);
          const goal = normalizeGoal(parsed);
          const goals = await getOrInitValue<Goal[]>(STORAGE_KEYS.GOALS, []);
          const next = [goal, ...goals];
          await setValue(STORAGE_KEYS.GOALS, next);
          return json({ goal, goals: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid goal payload");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = goalPatchSchema.parse(body);
          const goals = await getOrInitValue<Goal[]>(STORAGE_KEYS.GOALS, []);
          const current = goals.find((goal) => goal.id === parsed.id);
          if (!current) return json({ error: "Goal not found" }, { status: 404 });

          const merged = normalizeGoal({ ...current, ...parsed.patch });
          const next = goals.map((goal) => (goal.id === parsed.id ? merged : goal));
          await setValue(STORAGE_KEYS.GOALS, next);
          return json({ goal: merged, goals: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id, patch }");
        }
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const { id } = idPayloadSchema.parse(body);
          const goals = await getOrInitValue<Goal[]>(STORAGE_KEYS.GOALS, []);
          const next = goals.filter((goal) => goal.id !== id);
          await setValue(STORAGE_KEYS.GOALS, next);
          return json({ goals: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id }");
        }
      },
    },
  },
});
