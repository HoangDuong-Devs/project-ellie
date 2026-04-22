import { createFileRoute } from "@tanstack/react-router";
import {
  duplicateCalendarItem,
  markCalendarOccurrence,
  moveCalendarItem,
  replaceCalendarItem,
  resolveOccurrenceDate,
} from "@/services/calendar-actions.server";
import {
  removeCalendarItem,
  upsertCalendarItem,
} from "@/services/calendar-service";
import {
  cancelCalendarReminderJobs,
  syncCalendarReminderJobs,
} from "@/services/calendar-reminder-jobs.server";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import {
  calendarEventActionSchema,
  calendarItemPatchSchema,
  calendarItemSchema,
  idPayloadSchema,
} from "@/services/calendar-api-schemas";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";
import type { CalendarItem } from "@/types/calendar";

function toCalendarItem(input: Record<string, unknown>): CalendarItem | null {
  try {
    const parsed = calendarItemSchema.parse(input);
    return {
      ...parsed,
      id: parsed.id ?? crypto.randomUUID(),
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/calendar/events")({
  server: {
    handlers: {
      GET: async () => {
        const items = await getOrInitValue<CalendarItem[]>(STORAGE_KEYS.CALENDAR_ITEMS, []);
        return json({ items });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body)) return badRequest("Body must be a JSON object");

        try {
          const itemInput = isObject(body.item) ? body.item : body;
          const parsed = calendarItemSchema.parse(itemInput);
          const item: CalendarItem = {
            ...parsed,
            id: parsed.id ?? crypto.randomUUID(),
            createdAt: parsed.createdAt ?? new Date().toISOString(),
          };

          const items = await getOrInitValue<CalendarItem[]>(STORAGE_KEYS.CALENDAR_ITEMS, []);
          const next = upsertCalendarItem(items, item);
          await setValue(STORAGE_KEYS.CALENDAR_ITEMS, next);
          await syncCalendarReminderJobs(item);
          return json({ item, items: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid calendar item payload");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        const items = await getOrInitValue<CalendarItem[]>(STORAGE_KEYS.CALENDAR_ITEMS, []);

        try {
          const parsed = calendarItemPatchSchema.parse(body);
          const current = items.find((it) => it.id === parsed.id);
          if (!current) return json({ error: "Event not found" }, { status: 404 });

          const merged = toCalendarItem({ ...current, ...parsed.patch });
          if (!merged) return badRequest("Invalid patch payload");

          const next = upsertCalendarItem(items, merged);
          await setValue(STORAGE_KEYS.CALENDAR_ITEMS, next);
          await syncCalendarReminderJobs(merged);
          return json({ item: merged, items: next });
        } catch (error) {
          if (!(error instanceof ZodError)) {
            return badRequest("Expected { id, patch }");
          }
        }

        try {
          const parsed = calendarEventActionSchema.parse(body);
          const current = items.find((it) => it.id === parsed.id);
          if (!current) return json({ error: "Event not found" }, { status: 404 });

          if (parsed.action === "move") {
            if (!parsed.targetStartISO) return badRequest("targetStartISO is required for move");
            const moved = moveCalendarItem(current, parsed.targetStartISO, parsed.targetEndISO);
            const next = replaceCalendarItem(items, moved);
            await setValue(STORAGE_KEYS.CALENDAR_ITEMS, next);
            await syncCalendarReminderJobs(moved);
            return json({ item: moved, items: next });
          }

          if (parsed.action === "duplicate") {
            const duplicate = duplicateCalendarItem(current);
            const next = replaceCalendarItem(items, duplicate);
            await setValue(STORAGE_KEYS.CALENDAR_ITEMS, next);
            await syncCalendarReminderJobs(duplicate);
            return json({ item: duplicate, items: next });
          }

          const targetDate = resolveOccurrenceDate(current, parsed.targetDateISO);
          const field = parsed.action === "cancel-occurrence" ? "cancelledDates" : "completedDates";
          const updated = markCalendarOccurrence(current, targetDate, field);
          const next = replaceCalendarItem(items, updated);
          await setValue(STORAGE_KEYS.CALENDAR_ITEMS, next);
          if (parsed.action === "cancel-occurrence") {
            await syncCalendarReminderJobs(updated);
          }
          return json({ item: updated, items: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid calendar action payload");
        }
      },
      DELETE: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const { id } = idPayloadSchema.parse(body);
          const items = await getOrInitValue<CalendarItem[]>(STORAGE_KEYS.CALENDAR_ITEMS, []);
          const next = removeCalendarItem(items, id);
          await setValue(STORAGE_KEYS.CALENDAR_ITEMS, next);
          await cancelCalendarReminderJobs(id);
          return json({ items: next });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { id }");
        }
      },
    },
  },
});
