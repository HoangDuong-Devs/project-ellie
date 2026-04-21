import type { LabelColor, Sprint, WorkCard, WorkColumn, WorkData, WorkLabel, Workspace } from "@/types/work";
import { emitDataChanged } from "@/services/api-live-sync";

type WorkDataResponse = { data: WorkData };
type WorkspacesResponse = { workspace?: Workspace; workspaces: Workspace[] };
type ColumnsResponse = { column?: WorkColumn; columns: WorkColumn[]; cards?: WorkCard[] };
type CardsResponse = { card?: WorkCard; cards: WorkCard[] };
type LabelsResponse = { label?: WorkLabel; labels: WorkLabel[]; cards?: WorkCard[] };
type SprintsResponse = { sprint?: Sprint; sprints: Sprint[]; cards?: WorkCard[] };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || `Request failed: ${res.status}`);
  }
  return body as T;
}

export function getWorkData() {
  return request<WorkDataResponse>("/api/work/data");
}

export function createWorkspace(input: {
  name: string;
  icon?: string;
  color?: LabelColor;
  useSprints?: boolean;
  description?: string;
}) {
  return request<WorkspacesResponse>("/api/work/workspaces", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function patchWorkspace(id: string, patch: Partial<Workspace>) {
  return request<WorkspacesResponse>("/api/work/workspaces", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function deleteWorkspace(id: string) {
  return request<WorkspacesResponse>("/api/work/workspaces", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function createColumn(workspaceId: string, name: string) {
  return request<ColumnsResponse>("/api/work/columns", {
    method: "POST",
    body: JSON.stringify({ workspaceId, name }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function patchColumn(id: string, patch: Partial<Pick<WorkColumn, "name" | "order">>) {
  return request<ColumnsResponse>("/api/work/columns", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function deleteColumn(id: string) {
  return request<ColumnsResponse>("/api/work/columns", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function createCard(input: Partial<WorkCard> & { workspaceId: string; title: string; columnId?: string }) {
  return request<CardsResponse>("/api/work/cards", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function patchCard(id: string, patch: Partial<WorkCard>) {
  return request<CardsResponse>("/api/work/cards", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function deleteCard(id: string) {
  return request<CardsResponse>("/api/work/cards", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function moveCard(cardId: string, targetColumnId: string, targetIndex: number) {
  return request<CardsResponse>("/api/work/move-card", {
    method: "POST",
    body: JSON.stringify({ cardId, targetColumnId, targetIndex }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function createLabel(name: string, color: LabelColor) {
  return request<LabelsResponse>("/api/work/labels", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function deleteLabel(id: string) {
  return request<LabelsResponse>("/api/work/labels", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function createSprint(workspaceId: string, name: string, goal?: string) {
  return request<SprintsResponse>("/api/work/sprints", {
    method: "POST",
    body: JSON.stringify({ workspaceId, name, goal }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function patchSprint(id: string, patch: Partial<Sprint>) {
  return request<SprintsResponse>("/api/work/sprints", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function startSprint(id: string) {
  return request<SprintsResponse>("/api/work/sprints/start", {
    method: "POST",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function completeSprint(id: string, moveUnfinishedToBacklog = true) {
  return request<SprintsResponse>("/api/work/sprints/complete", {
    method: "POST",
    body: JSON.stringify({ id, moveUnfinishedToBacklog }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}

export function deleteSprint(id: string) {
  return request<SprintsResponse>("/api/work/sprints", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("work");
    return res;
  });
}
