import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ensureWorkData, makeDefaultWorkData } from "@/services/work-service";
import { startSprint } from "@/services/work-api";
import { idSchema } from "@/services/work-api-schemas";
import type { WorkData } from "@/types/work";

function zodMessage(error: ZodError) {
  return error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}

export const Route = createFileRoute("/api/work/sprints/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await safeJson(request);
        const payload = isObject(body) ? body : {};
        try {
          const id = idSchema.parse(payload.id);
          const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
          const next = startSprint(data, id);
          await setValue(STORAGE_KEYS.WORK, next);
          return json({ sprints: next.sprints });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid request body");
        }
      },
    },
  },
});
