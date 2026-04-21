import { createFileRoute } from "@tanstack/react-router";
import {
  listTransactionsForMonth,
  monthlySummary,
  totalBalance,
} from "@/services/finance-service";
import { badRequest, json } from "@/services/api-utils";
import { getOrInitValue } from "@/services/domain-store.server";
import { financeSummaryQuerySchema } from "@/services/finance-api-schemas";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";
import type { Transaction } from "@/types/finance";

export const Route = createFileRoute("/api/finance/summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let year: number;
        let month: number;
        try {
          const url = new URL(request.url);
          const now = new Date();
          const parsed = financeSummaryQuerySchema.parse({
            year: url.searchParams.get("year") ?? now.getFullYear(),
            month: url.searchParams.get("month") ?? now.getMonth(),
          });
          year = parsed.year ?? now.getFullYear();
          month = parsed.month ?? now.getMonth();
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid query params");
        }

        const transactions = await getOrInitValue<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
        const monthTransactions = listTransactionsForMonth(transactions, year, month);

        return json({
          year,
          month,
          summary: monthlySummary(transactions, year, month),
          monthTransactions,
          totalBalance: totalBalance(transactions),
        });
      },
    },
  },
});
