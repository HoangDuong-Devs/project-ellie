import { createFileRoute } from "@tanstack/react-router";
import {
  createWorkspaceWithDefaults,
  ensureWorkData,
  makeDefaultWorkData,
} from "@/services/work-service";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import type { WorkData } from "@/types/work";

export const Route = createFileRoute("/api/work/workspaces")({
  server: {
    handlers: {
      GET: async () => {
        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        return json({ workspaces: data.workspaces });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body) || typeof body.name !== "string") {
          return badRequest("Expected { name, ... }");
        }

        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        const created = createWorkspaceWithDefaults({
          name: body.name,
          icon: typeof body.icon === "string" ? body.icon : undefined,
          color: typeof body.color === "string" ? (body.color as any) : undefined,
          useSprints: typeof body.useSprints === "boolean" ? body.useSprints : undefined,
          description: typeof body.description === "string" ? body.description : undefined,
        });

        const next: WorkData = {
          ...data,
          workspaces: [...data.workspaces, created.workspace],
          columns: [...data.columns, ...created.columns],
        };

        await setValue(STORAGE_KEYS.WORK, next);
        return json({ workspace: created.workspace, workspaces: next.workspaces });
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body) || typeof body.id !== "string" || !isObject(body.patch)) {
          return badRequest("Expected { id, patch }");
        }

        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        const exists = data.workspaces.some((ws) => ws.id === body.id);
        if (!exists) return json({ error: "Workspace not found" }, { status: 404 });

        const next: WorkData = {
          ...data,
          workspaces: data.workspaces.map((workspace) =>
            workspace.id === body.id ? { ...workspace, ...body.patch } : workspace,
          ),
        };

        await setValue(STORAGE_KEYS.WORK, next);
        return json({ workspaces: next.workspaces });
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body) || typeof body.id !== "string") return badRequest("Expected { id }");

        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        const next: WorkData = {
          ...data,
          workspaces: data.workspaces.filter((ws) => ws.id !== body.id),
          columns: data.columns.filter((column) => column.workspaceId !== body.id),
          cards: data.cards.filter((card) => card.workspaceId !== body.id),
          sprints: data.sprints.filter((sprint) => sprint.workspaceId !== body.id),
        };

        await setValue(STORAGE_KEYS.WORK, ensureWorkData(next));
        return json({ workspaces: ensureWorkData(next).workspaces });
      },
    },
  },
});
