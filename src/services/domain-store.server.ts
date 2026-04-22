import "@tanstack/react-start/server-only";
import { getStorageValue, setStorageValue } from "@/services/storage-file.server";
import { publishServerChanges } from "@/services/server-live-sync.server";
import type { DataDomain } from "@/services/data-domains";

function domainsForKey(key: string): DataDomain[] {
  if (key.startsWith("ellie:transaction") || key.startsWith("ellie:savings") || key.startsWith("ellie:monthly-budget")) {
    return ["finance"];
  }
  if (key.startsWith("ellie:calendar") || key.startsWith("ellie:todos")) {
    return ["calendar"];
  }
  if (key.startsWith("ellie:goal")) {
    return ["goals"];
  }
  if (key.startsWith("ellie:focus") || key.startsWith("ellie:pomodoro")) {
    return ["focus"];
  }
  if (key.startsWith("ellie:work")) {
    return ["work"];
  }
  if (key.startsWith("ellie:notification")) {
    return ["notifications"];
  }
  if (key.startsWith("ellie:scheduler")) {
    return ["scheduler"];
  }
  return ["all"];
}

export async function getOrInitValue<T>(key: string, initial: T): Promise<T> {
  const found = await getStorageValue(key);
  if (found.found) return found.value as T;
  await setStorageValue(key, initial);
  return initial;
}

export async function setValue<T>(key: string, value: T): Promise<T> {
  await setStorageValue(key, value);
  publishServerChanges(domainsForKey(key), key);
  return value;
}

export function withUpdatedAt<T extends object>(value: T) {
  return {
    ...value,
    updatedAt: new Date().toISOString(),
  };
}
