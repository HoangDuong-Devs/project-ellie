import type { FocusSettings, PomodoroSession } from "@/types/focus";
import { emitDataChanged } from "@/services/api-live-sync";

type FocusSettingsResponse = { settings: FocusSettings };
type SessionsResponse = { sessions: PomodoroSession[] };
type SessionCreateResponse = { session: PomodoroSession; sessions: PomodoroSession[] };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `Request failed: ${res.status}`);
  }
  return json as T;
}

export function getFocusSettings() {
  return request<FocusSettingsResponse>("/api/focus/settings");
}

export function patchFocusSettings(patch: Partial<FocusSettings>) {
  return request<FocusSettingsResponse>("/api/focus/settings", {
    method: "PATCH",
    body: JSON.stringify({ patch }),
  }).then((res) => {
    emitDataChanged("focus");
    return res;
  });
}

export function listFocusSessions() {
  return request<SessionsResponse>("/api/focus/sessions");
}

export function createFocusSession(minutes: number, date?: string) {
  return request<SessionCreateResponse>("/api/focus/sessions", {
    method: "POST",
    body: JSON.stringify({ minutes, date }),
  }).then((res) => {
    emitDataChanged("focus");
    return res;
  });
}
