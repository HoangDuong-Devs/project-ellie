import { createFileRoute } from "@tanstack/react-router";
import { badRequest, json, safeJson } from "@/services/api-utils";
import {
  idPayloadSchema,
  todoPatchSchema,
  todoSchema,
} from "@/services/calendar-api-schemas";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";
import type { Todo } from "@/types/schedule";

export const Route = createFileRoute("/api/calendar/todos")({
  server: {
    handlers: {
      GET: async () => {
        const todos = await getOrInitValue<Todo[]>(STORAGE_KEYS.TODOS, []);
        return json({ todos });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = todoSchema.parse(body);
          const todos = await getOrInitValue<Todo[]>(STORAGE_KEYS.TODOS, []);
          const todo: Todo = {
            id: parsed.id ?? crypto.randomUUID(),
            title: parsed.title,
            priority: parsed.priority ?? "medium",
            done: parsed.done ?? false,
            createdAt: parsed.createdAt ?? new Date().toISOString(),
            dueDate: parsed.dueDate,
          };
          const next = [todo, ...todos];
          await setValue(STORAGE_KEYS.TODOS, next);
          return json({ todo, todos: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { title }");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = todoPatchSchema.parse(body);
          const todos = await getOrInitValue<Todo[]>(STORAGE_KEYS.TODOS, []);
          const next = todos.map((todo) =>
            todo.id === parsed.id ? { ...todo, ...parsed.patch } : todo,
          );
          await setValue(STORAGE_KEYS.TODOS, next);
          return json({ todos: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id, patch }");
        }
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const { id } = idPayloadSchema.parse(body);
          const todos = await getOrInitValue<Todo[]>(STORAGE_KEYS.TODOS, []);
          const next = todos.filter((todo) => todo.id !== id);
          await setValue(STORAGE_KEYS.TODOS, next);
          return json({ todos: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id }");
        }
      },
    },
  },
});
