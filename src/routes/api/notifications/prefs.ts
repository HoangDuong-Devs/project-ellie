import { createFileRoute } from "@tanstack/react-router";
import { badRequest, isObject, json, safeJson } from "@/services/api-utils";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from "@/types/notifications";

function asIntInRange(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const parsed = Math.trunc(value);
  return Math.max(min, Math.min(max, parsed));
}

function normalizeReminderOffsets(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  const uniq = new Set<number>();
  for (const raw of value) {
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const min = Math.trunc(raw);
    if (min < 0 || min > 10080) continue; // 7 days max
    uniq.add(min);
  }
  return Array.from(uniq).sort((a, b) => b - a);
}

function normalizePrefs(input: Partial<NotificationPrefs>): NotificationPrefs {
  return {
    calendar:
      typeof input.calendar === "boolean" ? input.calendar : DEFAULT_NOTIFICATION_PREFS.calendar,
    finance:
      typeof input.finance === "boolean" ? input.finance : DEFAULT_NOTIFICATION_PREFS.finance,
    goal: typeof input.goal === "boolean" ? input.goal : DEFAULT_NOTIFICATION_PREFS.goal,
    focus: typeof input.focus === "boolean" ? input.focus : DEFAULT_NOTIFICATION_PREFS.focus,
    system: typeof input.system === "boolean" ? input.system : DEFAULT_NOTIFICATION_PREFS.system,
    dailyDigest:
      typeof input.dailyDigest === "boolean"
        ? input.dailyDigest
        : DEFAULT_NOTIFICATION_PREFS.dailyDigest,
    dailySummaryHour: asIntInRange(
      input.dailySummaryHour,
      DEFAULT_NOTIFICATION_PREFS.dailySummaryHour,
      0,
      23,
    ),
    defaultCalendarReminders: normalizeReminderOffsets(
      input.defaultCalendarReminders,
      DEFAULT_NOTIFICATION_PREFS.defaultCalendarReminders,
    ),
    reminderRepeatEnabled:
      typeof input.reminderRepeatEnabled === "boolean"
        ? input.reminderRepeatEnabled
        : DEFAULT_NOTIFICATION_PREFS.reminderRepeatEnabled,
    reminderRepeatIntervalMinutes: asIntInRange(
      input.reminderRepeatIntervalMinutes,
      DEFAULT_NOTIFICATION_PREFS.reminderRepeatIntervalMinutes,
      1,
      120,
    ),
    reminderRepeatMaxTimes: asIntInRange(
      input.reminderRepeatMaxTimes,
      DEFAULT_NOTIFICATION_PREFS.reminderRepeatMaxTimes,
      1,
      10,
    ),
  };
}

export const Route = createFileRoute("/api/notifications/prefs")({
  server: {
    handlers: {
      GET: async () => {
        const prefs = await getOrInitValue<NotificationPrefs>(
          STORAGE_KEYS.NOTIFICATION_PREFS,
          DEFAULT_NOTIFICATION_PREFS,
        );
        return json({ prefs: normalizePrefs(prefs) });
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        if (!isObject(body) || !isObject(body.patch)) {
          return badRequest("Expected { patch }");
        }

        const current = await getOrInitValue<NotificationPrefs>(
          STORAGE_KEYS.NOTIFICATION_PREFS,
          DEFAULT_NOTIFICATION_PREFS,
        );
        const next = normalizePrefs({ ...current, ...(body.patch as Partial<NotificationPrefs>) });
        await setValue(STORAGE_KEYS.NOTIFICATION_PREFS, next);
        return json({ prefs: next });
      },
      POST: async () => {
        await setValue(STORAGE_KEYS.NOTIFICATION_PREFS, DEFAULT_NOTIFICATION_PREFS);
        return json({ prefs: DEFAULT_NOTIFICATION_PREFS });
      },
    },
  },
});
