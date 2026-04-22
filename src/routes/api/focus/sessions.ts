import { createFileRoute } from "@tanstack/react-router";
import { badRequest, json, safeJson } from "@/services/api-utils";
import {
  idPayloadSchema,
  pomodoroSessionPatchSchema,
  pomodoroSessionSchema,
} from "@/services/goals-focus-api-schemas";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";
import type { PomodoroSession } from "@/types/focus";

export const Route = createFileRoute("/api/focus/sessions")({
  server: {
    handlers: {
      GET: async () => {
        const sessions = await getOrInitValue<PomodoroSession[]>(STORAGE_KEYS.POMODOROS, []);
        return json({ sessions });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = pomodoroSessionSchema.parse(body);
          const session: PomodoroSession = {
            id: parsed.id ?? crypto.randomUUID(),
            date: parsed.date ?? new Date().toISOString(),
            minutes: parsed.minutes,
          };

          const sessions = await getOrInitValue<PomodoroSession[]>(STORAGE_KEYS.POMODOROS, []);
          const next = [session, ...sessions];
          await setValue(STORAGE_KEYS.POMODOROS, next);
          return json({ session, sessions: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid focus session payload");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = pomodoroSessionPatchSchema.parse(body);
          const sessions = await getOrInitValue<PomodoroSession[]>(STORAGE_KEYS.POMODOROS, []);
          const current = sessions.find((session) => session.id === parsed.id);
          if (!current) return json({ error: "Focus session not found" }, { status: 404 });

          const merged: PomodoroSession = {
            ...current,
            ...parsed.patch,
          };
          const next = sessions.map((session) => (session.id === parsed.id ? merged : session));
          await setValue(STORAGE_KEYS.POMODOROS, next);
          return json({ session: merged, sessions: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id, patch }");
        }
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const { id } = idPayloadSchema.parse(body);
          const sessions = await getOrInitValue<PomodoroSession[]>(STORAGE_KEYS.POMODOROS, []);
          const next = sessions.filter((session) => session.id !== id);
          await setValue(STORAGE_KEYS.POMODOROS, next);
          return json({ sessions: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id }");
        }
      },
    },
  },
});
