import { useCallback, useEffect, useState } from "react";
import type { NotificationCategory } from "./useNotificationCenter";

/** Preference toggles per notification category + the daily digest. */
export interface NotificationPrefs {
  calendar: boolean;
  finance: boolean;
  goal: boolean;
  focus: boolean;
  system: boolean;
  /** Daily morning calendar digest — independent of the calendar category. */
  dailyDigest: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  calendar: true,
  finance: true,
  goal: true,
  focus: true,
  system: true,
  dailyDigest: true,
};

const STORAGE_KEY = "ellie:notification-prefs";
const EVENT = "ellie:notification-prefs:update";

function readPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(p: NotificationPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

/** Synchronous getter for use inside non-hook code (notify engine). */
export function getNotificationPrefs(): NotificationPrefs {
  return readPrefs();
}

/** Returns true if a given category is currently enabled. */
export function isCategoryEnabled(category: NotificationCategory): boolean {
  return readPrefs()[category] ?? true;
}

/** Returns true if the daily digest is enabled. */
export function isDailyDigestEnabled(): boolean {
  return readPrefs().dailyDigest;
}

export function useNotificationPrefs() {
  const [prefs, setPrefsState] = useState<NotificationPrefs>(() => readPrefs());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setPrefsState(readPrefs());
    window.addEventListener(EVENT, refresh);
    const storage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", storage);
    };
  }, []);

  const setPref = useCallback(<K extends keyof NotificationPrefs>(key: K, value: boolean) => {
    const next = { ...readPrefs(), [key]: value };
    writePrefs(next);
    setPrefsState(next);
  }, []);

  const reset = useCallback(() => {
    writePrefs(DEFAULT_PREFS);
    setPrefsState(DEFAULT_PREFS);
  }, []);

  return { prefs, setPref, reset };
}
