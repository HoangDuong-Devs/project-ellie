import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ensureWorkData, makeDefaultWorkData } from "@/services/work-service";
import { completeSprint, startSprint, updateSprint } from "@/services/work-api";
import { idSchema } from "@/services/work-api-schemas";
import type { WorkData } from "@/types/work";

function zodMessage(error: ZodError) {
  return error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}

export const Route = createFileRoute("/api/work/sprints/actions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await safeJson(request);
        const payload = isObject(body) ? body : {};
        try {
          const id = idSchema.parse(payload.id);
          const action = typeof payload.action === "string" ? payload.action : "";
          const data = ensureWorkData(
            await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()),
          );

          const next =
            action === "start"
              ? startSprint(data, id)
              : action === "complete"
                ? completeSprint(
                    data,
                    id,
                    typeof payload.moveUnfinishedToBacklog === "boolean"
                      ? payload.moveUnfinishedToBacklog
                      : true,
                  )
                : action === "reopen"
                  ? updateSprint(data, id, { state: "planned", endDate: undefined })
                  : null;

          if (!next) return badRequest("Unsupported sprint action");
          await setValue(STORAGE_KEYS.WORK, next);
          return json({ sprints: next.sprints, cards: next.cards });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid request body");
        }
      },
    },
  },
});
