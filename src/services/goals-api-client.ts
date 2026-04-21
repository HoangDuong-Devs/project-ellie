import type { Goal } from "@/types/goals";
import { emitDataChanged } from "@/services/api-live-sync";

type GoalsResponse = { goals: Goal[] };
type GoalUpsertResponse = { goal: Goal; goals: Goal[] };

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

export function listGoals() {
  return request<GoalsResponse>("/api/goals");
}

export function createGoal(input: Partial<Goal> & { title: string }) {
  return request<GoalUpsertResponse>("/api/goals", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((res) => {
    emitDataChanged("goals");
    return res;
  });
}

export function patchGoal(id: string, patch: Partial<Goal>) {
  return request<GoalUpsertResponse>("/api/goals", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("goals");
    return res;
  });
}

export function deleteGoal(id: string) {
  return request<GoalsResponse>("/api/goals", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("goals");
    return res;
  });
}
