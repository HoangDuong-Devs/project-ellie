import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ensureWorkData, makeDefaultWorkData } from "@/services/work-service";
import { addColumn, removeColumn, updateColumn } from "@/services/work-api";
import { columnCreateSchema, columnPatchSchema, idSchema } from "@/services/work-api-schemas";
import type { WorkData } from "@/types/work";

function zodMessage(error: ZodError) {
  return error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}

export const Route = createFileRoute("/api/work/columns")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const workspaceId = url.searchParams.get("workspaceId");
        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        const columns = workspaceId ? data.columns.filter((c) => c.workspaceId === workspaceId) : data.columns;
        return json({ columns });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = columnCreateSchema.parse(body);
          const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
          const next = addColumn(data, parsed.workspaceId, parsed.name);
          await setValue(STORAGE_KEYS.WORK, next.data);
          return json({ column: next.column, columns: next.data.columns });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid request body");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = columnPatchSchema.parse(body);
          const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
          const next = updateColumn(data, parsed.id, parsed.patch);
          await setValue(STORAGE_KEYS.WORK, next);
          return json({ columns: next.columns });
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
          const next = removeColumn(data, id);
          await setValue(STORAGE_KEYS.WORK, next);
          return json({ columns: next.columns, cards: next.cards });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid request body");
        }
      },
    },
  },
});
