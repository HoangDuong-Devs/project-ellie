import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ensureWorkData, makeDefaultWorkData } from "@/services/work-service";
import { addLabel, removeLabel, updateLabel } from "@/services/work-api";
import { idSchema, labelCreateSchema, labelPatchSchema } from "@/services/work-api-schemas";
import type { WorkData } from "@/types/work";

function zodMessage(error: ZodError) {
  return error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}

export const Route = createFileRoute("/api/work/labels")({
  server: {
    handlers: {
      GET: async () => {
        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        return json({ labels: data.labels });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = labelCreateSchema.parse(body);
          const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
          const next = addLabel(data, parsed.name, parsed.color);
          await setValue(STORAGE_KEYS.WORK, next.data);
          return json({ label: next.label, labels: next.data.labels });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid request body");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = labelPatchSchema.parse(body);
          const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
          const next = updateLabel(data, parsed.id, parsed.patch);
          await setValue(STORAGE_KEYS.WORK, next);
          return json({ labels: next.labels });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid request body");
        }
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        const payload = isObject(body) ? body : {};
        try {
          const id = idSchema.parse(payload.id);
          const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
          const next = removeLabel(data, id);
          await setValue(STORAGE_KEYS.WORK, next);
          return json({ labels: next.labels, cards: next.cards });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid request body");
        }
      },
    },
  },
});
