import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_CALENDARS } from "@/services/calendar-service";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import {
  calendarPatchSchema,
  calendarSchema,
  idPayloadSchema,
} from "@/services/calendar-api-schemas";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";
import type { Calendar } from "@/types/calendar";

function toCalendar(input: Record<string, unknown>): Calendar | null {
  try {
    const parsed = calendarSchema.parse(input);
    return {
      ...parsed,
      id: parsed.id ?? crypto.randomUUID(),
      visible: parsed.visible ?? true,
    };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/calendar/calendars")({
  server: {
    handlers: {
      GET: async () => {
        const calendars = await getOrInitValue<Calendar[]>(STORAGE_KEYS.CALENDARS, DEFAULT_CALENDARS);
        return json({ calendars });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body)) return badRequest("Body must be a JSON object");
        try {
          const input = isObject(body.calendar) ? body.calendar : body;
          const parsed = calendarSchema.parse(input);
          const calendar: Calendar = {
            ...parsed,
            id: parsed.id ?? crypto.randomUUID(),
            visible: parsed.visible ?? true,
          };

          const calendars = await getOrInitValue<Calendar[]>(STORAGE_KEYS.CALENDARS, DEFAULT_CALENDARS);
          const next = [...calendars, calendar];
          await setValue(STORAGE_KEYS.CALENDARS, next);
          return json({ calendar, calendars: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid calendar payload");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = calendarPatchSchema.parse(body);
          const calendars = await getOrInitValue<Calendar[]>(STORAGE_KEYS.CALENDARS, DEFAULT_CALENDARS);
          const hasCalendar = calendars.some((c) => c.id === parsed.id);
          if (!hasCalendar) return json({ error: "Calendar not found" }, { status: 404 });

          const next = calendars.map((calendar) =>
            calendar.id === parsed.id
              ? {
                  ...calendar,
                  ...parsed.patch,
                }
              : calendar,
          );
          await setValue(STORAGE_KEYS.CALENDARS, next);
          return json({ calendars: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id, patch }");
        }
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const { id } = idPayloadSchema.parse(body);
          const calendars = await getOrInitValue<Calendar[]>(STORAGE_KEYS.CALENDARS, DEFAULT_CALENDARS);
          const next = calendars.filter((c) => c.id !== id);
          await setValue(STORAGE_KEYS.CALENDARS, next);
          return json({ calendars: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id }");
        }
      },
    },
  },
});
