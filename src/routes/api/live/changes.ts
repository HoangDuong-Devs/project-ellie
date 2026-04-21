import { createFileRoute } from "@tanstack/react-router";
import type { DataDomain } from "@/services/data-domains";
import { subscribeServerChanges } from "@/services/server-live-sync.server";

function parseDomains(search: URLSearchParams): DataDomain[] {
  const raw = search.get("domains");
  if (!raw) return ["all"];
  const values = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean) as DataDomain[];
  return values.length > 0 ? values : ["all"];
}

function intersects(target: DataDomain[], changed: DataDomain[]) {
  if (target.includes("all") || changed.includes("all")) return true;
  return target.some((d) => changed.includes(d));
}

export const Route = createFileRoute("/api/live/changes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const targetDomains = parseDomains(url.searchParams);
        const encoder = new TextEncoder();

        let heartbeatId: ReturnType<typeof setInterval> | undefined;
        let unsubscribe: (() => void) | undefined;

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (event: string, data: unknown) => {
              controller.enqueue(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
              );
            };

            send("ready", { ok: true, at: new Date().toISOString() });
            unsubscribe = subscribeServerChanges((payload) => {
              if (!intersects(targetDomains, payload.domains)) return;
              send("change", payload);
            });

            heartbeatId = setInterval(() => {
              controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
            }, 15000);

            request.signal.addEventListener("abort", () => {
              if (heartbeatId) clearInterval(heartbeatId);
              if (unsubscribe) unsubscribe();
              controller.close();
            });
          },
          cancel() {
            if (heartbeatId) clearInterval(heartbeatId);
            if (unsubscribe) unsubscribe();
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});
