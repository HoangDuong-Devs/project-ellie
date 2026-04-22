import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/services/api-utils";
import { runDueSchedulerJobs } from "@/services/scheduler-service.server";

export const Route = createFileRoute("/api/scheduler/run")({
  server: {
    handlers: {
      POST: async () => {
        const result = await runDueSchedulerJobs();
        return json(result);
      },
    },
  },
});
