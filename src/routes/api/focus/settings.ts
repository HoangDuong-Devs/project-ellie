import { createFileRoute } from "@tanstack/react-router";
import { badRequest, json, safeJson } from "@/services/api-utils";
import {
  focusSettingsPatchSchema,
  focusSettingsSchema,
} from "@/services/goals-focus-api-schemas";
import { getOrInitValue, setValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ZodError, zodMessage } from "@/services/zod-utils";
import type { FocusSettings } from "@/types/focus";

const DEFAULT_SETTINGS: FocusSettings = {
  workMinutes: 25,
  breakMinutes: 5,
};

export const Route = createFileRoute("/api/focus/settings")({
  server: {
    handlers: {
      GET: async () => {
        const settings = await getOrInitValue<FocusSettings>(STORAGE_KEYS.FOCUS_SETTINGS, DEFAULT_SETTINGS);
        return json({ settings });
      },
      POST: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = focusSettingsSchema.parse(body);
          await setValue(STORAGE_KEYS.FOCUS_SETTINGS, parsed);
          return json({ settings: parsed });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Invalid settings payload");
        }
      },
      PATCH: async ({ request }) => {
        const body = await safeJson(request);
        try {
          const parsed = focusSettingsPatchSchema.parse(body);
          const settings = await getOrInitValue<FocusSettings>(STORAGE_KEYS.FOCUS_SETTINGS, DEFAULT_SETTINGS);
          const next = {
            ...settings,
            ...parsed.patch,
          };
          const validated = focusSettingsSchema.parse(next);
          await setValue(STORAGE_KEYS.FOCUS_SETTINGS, validated);
          return json({ settings: validated });
        } catch (error) {
          if (error instanceof ZodError) return badRequest(zodMessage(error));
          return badRequest("Expected { patch } for focus settings");
        }
      },
    },
  },
});
