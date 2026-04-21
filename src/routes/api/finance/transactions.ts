import { createFileRoute } from "@tanstack/react-router";
import {
  addTransaction,
  removeTransaction,
  updateTransaction,
} from "@/services/finance-service";
import { badRequest, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import {
  idPayloadSchema,
  transactionCreateSchema,
  transactionPatchSchema,
} from "@/services/finance-api-schemas";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";
import type { Transaction } from "@/types/finance";

export const Route = createFileRoute("/api/finance/transactions")({
  server: {
    handlers: {
      GET: async () => {
        const transactions = await getOrInitValue<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
        return json({ transactions });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = transactionCreateSchema.parse(body);
          const transactions = await getOrInitValue<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
          const next = addTransaction(transactions, parsed);
          await setValue(STORAGE_KEYS.TRANSACTIONS, next);
          return json({ transactions: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid transaction payload");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = transactionPatchSchema.parse(body);
          const transactions = await getOrInitValue<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
          const existing = transactions.some((t) => t.id === parsed.id);
          if (!existing) return json({ error: "Transaction not found" }, { status: 404 });

          const next = updateTransaction(transactions, parsed.id, parsed.patch);
          await setValue(STORAGE_KEYS.TRANSACTIONS, next);
          return json({ transactions: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id, patch }");
        }
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const { id } = idPayloadSchema.parse(body);
          const transactions = await getOrInitValue<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
          const next = removeTransaction(transactions, id);
          await setValue(STORAGE_KEYS.TRANSACTIONS, next);
          return json({ transactions: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id }");
        }
      },
    },
  },
});
