import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/services/api-utils";
import { getOrInitValue } from "@/services/domain-store.server";
import { STORAGE_KEYS } from "@/services/storage-keys";
import { ensureWorkData, makeDefaultWorkData } from "@/services/work-service";
import type { WorkData } from "@/types/work";

export const Route = createFileRoute("/api/work/data")({
  server: {
    handlers: {
      GET: async () => {
        const data = ensureWorkData(await getOrInitValue<WorkData>(STORAGE_KEYS.WORK, makeDefaultWorkData()));
        return json({ data });
      },
    },
  },
});
