import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { badRequest, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ensureWorkData, makeDefaultWorkData } from "@/services/work-service";
import { moveCard } from "@/services/work-api";
import { moveCardSchema } from "@/services/work-api-schemas";
import type { WorkData } from "@/types/work";

function zodMessage(error: ZodError) {
  return error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}

export const Route = createFileRoute("/api/work/move-card")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = moveCardSchema.parse(body);
          const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
          const next = moveCard(data, parsed.cardId, parsed.targetColumnId, parsed.targetIndex);
          await setValue(STORAGE_KEYS.WORK, next);
          return json({ cards: next.cards });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid request body");
        }
      },
    },
  },
});
