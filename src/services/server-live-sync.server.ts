import "@tanstack/react-start/server-only";
import type { DataDomain } from "@/services/data-domains";

type ChangePayload = {
  domains: DataDomain[];
  key?: string;
  at: string;
};

const listeners = new Set<(payload: ChangePayload) => void>();

export function subscribeServerChanges(listener: (payload: ChangePayload) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishServerChanges(domains: DataDomain[], key?: string) {
  const payload: ChangePayload = {
    domains,
    key,
    at: new Date().toISOString(),
  };
  for (const listener of listeners) {
    listener(payload);
  }
}
