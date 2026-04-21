import { useStorageState } from "@/hooks/useStorageState";

// Backward-compatible alias. Prefer useStorageState for new code.
export function useLocalStorage<T>(key: string, initial: T) {
  return useStorageState<T>(key, initial);
}
