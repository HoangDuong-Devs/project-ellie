import { useCallback, useEffect, useState } from "react";
import type { NotificationCategory } from "@/types/notifications";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from "@/types/notifications";
import {
  getNotificationPrefs as getNotificationPrefsApi,
  patchNotificationPrefs,
  resetNotificationPrefs,
} from "@/services/notification-api-client";
import { useDataAutoRefresh } from "@/services/api-live-sync";

let prefsCache: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS;

function setPrefsCache(next: NotificationPrefs) {
  prefsCache = { ...DEFAULT_NOTIFICATION_PREFS, ...next };
}

function mergePrefs(next: Partial<NotificationPrefs>): NotificationPrefs {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...next };
}

export function getNotificationPrefs(): NotificationPrefs {
  return prefsCache;
}

export function isCategoryEnabled(category: NotificationCategory): boolean {
  return prefsCache[category] ?? true;
}

export function isDailyDigestEnabled(): boolean {
  return prefsCache.dailyDigest;
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(prefsCache);

  const refresh = useCallback(async () => {
    const res = await getNotificationPrefsApi();
    const next = mergePrefs(res.prefs);
    setPrefsCache(next);
    setPrefs(next);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getNotificationPrefsApi();
        if (!active) return;
        const next = mergePrefs(res.prefs);
        setPrefsCache(next);
        setPrefs(next);
      } catch {
        if (!active) return;
        setPrefsCache(prefsCache);
        setPrefs(prefsCache);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useDataAutoRefresh(refresh, "notifications");

  const setPref = useCallback(
    async <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      const previous = prefsCache;
      const optimistic = { ...prefsCache, [key]: value };
      setPrefsCache(optimistic);
      setPrefs(optimistic);

      try {
        const res = await patchNotificationPrefs({ [key]: value } as Partial<NotificationPrefs>);
        const next = mergePrefs(res.prefs);
        setPrefsCache(next);
        setPrefs(next);
      } catch {
        setPrefsCache(previous);
        setPrefs(previous);
      }
    },
    [],
  );

  const reset = useCallback(async () => {
    const previous = prefsCache;
    setPrefsCache(DEFAULT_NOTIFICATION_PREFS);
    setPrefs(DEFAULT_NOTIFICATION_PREFS);

    try {
      const res = await resetNotificationPrefs();
      const next = mergePrefs(res.prefs);
      setPrefsCache(next);
      setPrefs(next);
    } catch {
      setPrefsCache(previous);
      setPrefs(previous);
    }
  }, []);

  return { prefs, setPref, reset };
}

export type { NotificationPrefs };
export { DEFAULT_NOTIFICATION_PREFS as DEFAULT_PREFS };
