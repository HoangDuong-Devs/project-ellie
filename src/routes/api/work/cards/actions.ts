import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { badRequest, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ensureWorkData, makeDefaultWorkData } from "@/services/work-service";
import { applyCardAction } from "@/services/work-api";
import { cardActionSchema } from "@/services/work-api-schemas";
import type { WorkData } from "@/types/work";

function zodMessage(error: ZodError) {
  return error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}

export const Route = createFileRoute("/api/work/cards/actions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = cardActionSchema.parse(body);
          const data = ensureWorkData(
            await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()),
          );
          const next = applyCardAction(data, parsed.cardId, parsed.action, {
            assignee: parsed.assignee,
            sprintId: parsed.sprintId,
          });
          await setValue(STORAGE_KEYS.WORK, next.data);
          return json({ card: next.card, cards: next.data.cards });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid request body");
        }
      },
    },
  },
});
