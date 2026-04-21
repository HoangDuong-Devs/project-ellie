import { useEffect } from "react";
import type { DataDomain } from "@/services/data-domains";

const EVENT_NAME = "ellie:data-changed";
const STORAGE_SIGNAL_KEY = "ellie:data-changed:signal";
const SSE_URL = "/api/live/changes";

function normalizeDomains(domains: DataDomain | DataDomain[]): DataDomain[] {
  return Array.isArray(domains) ? domains : [domains];
}

function intersects(target: DataDomain[], changed: DataDomain[]) {
  if (target.includes("all") || changed.includes("all")) return true;
  return target.some((d) => changed.includes(d));
}

export function emitDataChanged(domains: DataDomain | DataDomain[]) {
  if (typeof window === "undefined") return;
  const changed = normalizeDomains(domains);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { domains: changed } }));
  try {
    window.localStorage.setItem(
      STORAGE_SIGNAL_KEY,
      JSON.stringify({ domains: changed, ts: Date.now() }),
    );
  } catch {
    // ignore storage errors (private mode / quota)
  }
}

export function useDataAutoRefresh(
  refresh: () => void | Promise<void>,
  domains: DataDomain | DataDomain[],
) {
  useEffect(() => {
    const target = normalizeDomains(domains);
    const runRefresh = () => {
      Promise.resolve(refresh()).catch(() => {
        // ignore refresh errors to avoid unhandled promise rejections
      });
    };

    const handleEvent = (event: Event) => {
      const custom = event as CustomEvent<{ domains?: DataDomain[] }>;
      const changed = custom.detail?.domains ?? ["all"];
      if (intersects(target, changed)) {
        runRefresh();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_SIGNAL_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as { domains?: DataDomain[] };
        const changed = parsed.domains ?? ["all"];
        if (intersects(target, changed)) {
          runRefresh();
        }
      } catch {
        // ignore malformed payload
      }
    };

    const handleFocus = () => {
      runRefresh();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runRefresh();
      }
    };

    let source: EventSource | null = null;
    const connectSse = () => {
      if (typeof window === "undefined" || typeof window.EventSource === "undefined") return;
      try {
        const params = new URLSearchParams();
        params.set("domains", target.join(","));
        source = new window.EventSource(`${SSE_URL}?${params.toString()}`);
        source.addEventListener("change", (event: MessageEvent) => {
          try {
            const payload = JSON.parse(String(event.data)) as { domains?: DataDomain[] };
            const changed = payload.domains ?? ["all"];
            if (intersects(target, changed)) {
              runRefresh();
            }
          } catch {
            // ignore malformed payload
          }
        });
      } catch {
        // ignore SSE failures; focus/storage/local events still work
      }
    };
    connectSse();

    window.addEventListener(EVENT_NAME, handleEvent as EventListener);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener(EVENT_NAME, handleEvent as EventListener);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      source?.close();
    };
  }, [domains, refresh]);
}
