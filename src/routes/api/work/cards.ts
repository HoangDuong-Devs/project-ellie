import { createFileRoute } from "@tanstack/react-router";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ensureWorkData, makeDefaultWorkData } from "@/services/work-service";
import type { WorkCard, WorkData } from "@/types/work";

export const Route = createFileRoute("/api/work/cards")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const workspaceId = url.searchParams.get("workspaceId");
        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        const cards = workspaceId
          ? data.cards.filter((card) => card.workspaceId === workspaceId)
          : data.cards;
        return json({ cards });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body) || typeof body.workspaceId !== "string" || typeof body.title !== "string") {
          return badRequest("Expected { workspaceId, title, ... }");
        }

        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        const columns = data.columns
          .filter((column) => column.workspaceId === body.workspaceId)
          .sort((a, b) => a.order - b.order);
        const columnId =
          typeof body.columnId === "string" ? body.columnId : (columns[0]?.id ?? "");

        const order = data.cards.filter(
          (card) => card.workspaceId === body.workspaceId && card.columnId === columnId,
        ).length;

        const now = new Date().toISOString();
        const card: WorkCard = {
          id: crypto.randomUUID(),
          workspaceId: body.workspaceId,
          title: body.title,
          description: typeof body.description === "string" ? body.description : undefined,
          columnId,
          status: body.status === "backlog" ? "backlog" : "active",
          priority:
            body.priority === "highest" ||
            body.priority === "high" ||
            body.priority === "low" ||
            body.priority === "lowest"
              ? body.priority
              : "medium",
          type: body.type === "story" || body.type === "bug" ? body.type : "task",
          labelIds: Array.isArray(body.labelIds)
            ? body.labelIds.filter((id): id is string => typeof id === "string")
            : [],
          subtasks: [],
          dueDate: typeof body.dueDate === "string" ? body.dueDate : undefined,
          storyPoints: typeof body.storyPoints === "number" ? body.storyPoints : undefined,
          sprintId:
            typeof body.sprintId === "string" ? body.sprintId : body.sprintId === null ? null : null,
          assignee: typeof body.assignee === "string" ? body.assignee : undefined,
          order,
          createdAt: now,
          updatedAt: now,
        };

        const next: WorkData = {
          ...data,
          cards: [...data.cards, card],
        };

        await setValue(STORAGE_KEYS.WORK, next);
        return json({ card, cards: next.cards });
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body) || typeof body.id !== "string" || !isObject(body.patch)) {
          return badRequest("Expected { id, patch }");
        }

        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        const exists = data.cards.some((card) => card.id === body.id);
        if (!exists) return json({ error: "Card not found" }, { status: 404 });

        const next: WorkData = {
          ...data,
          cards: data.cards.map((card) =>
            card.id === body.id
              ? { ...card, ...body.patch, updatedAt: new Date().toISOString() }
              : card,
          ),
        };

        await setValue(STORAGE_KEYS.WORK, next);
        return json({ cards: next.cards });
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body) || typeof body.id !== "string") return badRequest("Expected { id }");

        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        const next: WorkData = {
          ...data,
          cards: data.cards.filter((card) => card.id !== body.id),
        };

        await setValue(STORAGE_KEYS.WORK, next);
        return json({ cards: next.cards });
      },
    },
  },
});
