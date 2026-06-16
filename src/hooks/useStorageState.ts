import { useCallback, useEffect, useRef, useState } from "react";
import { getStorageValueServer, setStorageValueServer } from "@/services/storage-rpc";

export function useStorageState<T>(key: string, initial: T) {
  const initialRef = useRef(initial);
  const [value, setValue] = useState<T>(initialRef.current);
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);
  const lastSyncedRef = useRef<T | undefined>(undefined);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  useEffect(() => {
    mountedRef.current = true;
    setReady(false);

    (async () => {
      try {
        const remote = await getStorageValueServer({ data: { key } });
        if (!mountedRef.current) return;

        if (remote.found) {
          setValue(remote.value as T);
          return;
        }

        // One-time migration from legacy browser localStorage into server file storage.
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as T;
            setValue(parsed);
            await setStorageValueServer({ data: { key, value: parsed } });
          } else {
            setValue(initialRef.current);
            await setStorageValueServer({ data: { key, value: initialRef.current } });
          }
        } else {
          setValue(initialRef.current);
          await setStorageValueServer({ data: { key, value: initialRef.current } });
        }
      } catch {
        // Keep using in-memory state if the backend is temporarily unavailable.
      } finally {
        if (mountedRef.current) setReady(true);
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [key]);

  useEffect(() => {
    if (!ready) return;

    // Skip syncing on the initial mount load
    if (lastSyncedRef.current === undefined) {
      lastSyncedRef.current = value;
      return;
    }

    const timer = setTimeout(() => {
      if (value !== lastSyncedRef.current) {
        lastSyncedRef.current = value;
        setStorageValueServer({ data: { key, value } }).catch(() => {
          /* ignore */
        });
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [key, ready, value]);

  useEffect(() => {
    return () => {
      // Sync on unmount if there are unsaved changes
      if (
        ready &&
        lastSyncedRef.current !== undefined &&
        valueRef.current !== lastSyncedRef.current
      ) {
        setStorageValueServer({ data: { key, value: valueRef.current } }).catch(() => {
          /* ignore */
        });
      }
    };
  }, [key, ready]);

  const reset = useCallback(() => setValue(initialRef.current), []);

  return [value, setValue, reset] as const;
}

// Backward-compatible export while migrating call-sites.
export const useLocalStorage = useStorageState;
