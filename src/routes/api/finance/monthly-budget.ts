import { createFileRoute } from "@tanstack/react-router";
import { badRequest, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import {
  monthlyBudgetPayloadSchema,
  monthlyBudgetQuerySchema,
  monthlyBudgetSchema,
} from "@/services/finance-api-schemas";
import {
  DEFAULT_MONTHLY_BUDGET,
  getMonthBudgetKey,
  type MonthlyBudget,
  type MonthlyBudgetStore,
} from "@/services/finance-service";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";

function hasAnyBudgetValues(budget: MonthlyBudget) {
  return budget.total > 0 || Object.keys(budget.categories).length > 0;
}

function normalizeStore(raw: unknown): MonthlyBudgetStore {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const parsedStore = Object.entries(raw).reduce<MonthlyBudgetStore>((acc, [key, value]) => {
      const parsed = monthlyBudgetSchema.safeParse(value);
      if (parsed.success) acc[key] = parsed.data;
      return acc;
    }, {});
    if (Object.keys(parsedStore).length > 0) return parsedStore;
  }

  const legacy = monthlyBudgetSchema.safeParse(raw);
  if (legacy.success && hasAnyBudgetValues(legacy.data)) {
    const now = new Date();
    return {
      [getMonthBudgetKey(now.getFullYear(), now.getMonth())]: legacy.data,
    };
  }

  return {};
}

export const Route = createFileRoute("/api/finance/monthly-budget")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const parsed = monthlyBudgetQuerySchema.parse({
            year: url.searchParams.get("year"),
            month: url.searchParams.get("month"),
          });
          const raw = await getOrInitValue<unknown>(STORAGE_KEYS.MONTHLY_BUDGET, {});
          const store = normalizeStore(raw);
          const key = getMonthBudgetKey(parsed.year, parsed.month);
          return json({
            year: parsed.year,
            month: parsed.month,
            key,
            budget: store[key] ?? DEFAULT_MONTHLY_BUDGET,
          });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid monthly budget query");
        }
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = monthlyBudgetPayloadSchema.parse(body);
          const raw = await getOrInitValue<unknown>(STORAGE_KEYS.MONTHLY_BUDGET, {});
          const store = normalizeStore(raw);
          const key = getMonthBudgetKey(parsed.year, parsed.month);
          const next = {
            ...store,
            [key]: parsed.budget,
          };
          await setValue(STORAGE_KEYS.MONTHLY_BUDGET, next);
          return json({ year: parsed.year, month: parsed.month, key, budget: next[key] });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid monthly budget payload");
        }
      },
    },
  },
});
