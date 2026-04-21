import { uid } from "@/lib/format";
import type { LabelColor, Sprint, WorkCard, WorkColumn, WorkData, WorkLabel } from "@/types/work";

export function addColumn(data: WorkData, workspaceId: string, name: string): { data: WorkData; column: WorkColumn } {
  const order = data.columns.filter((c) => c.workspaceId === workspaceId).length;
  const column: WorkColumn = {
    id: uid(),
    workspaceId,
    name,
    order,
  };
  return {
    data: {
      ...data,
      columns: [...data.columns, column],
    },
    column,
  };
}

export function updateColumn(data: WorkData, id: string, patch: Partial<Pick<WorkColumn, "name" | "order">>): WorkData {
  return {
    ...data,
    columns: data.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
}

export function removeColumn(data: WorkData, id: string): WorkData {
  const col = data.columns.find((c) => c.id === id);
  if (!col) return data;
  const fallback = data.columns
    .filter((c) => c.workspaceId === col.workspaceId && c.id !== id)
    .sort((a, b) => a.order - b.order)[0];

  return {
    ...data,
    columns: data.columns.filter((c) => c.id !== id),
    cards: data.cards.map((card) => {
      if (card.columnId !== id) return card;
      if (!fallback) return { ...card, status: "backlog", updatedAt: new Date().toISOString() };
      return {
        ...card,
        columnId: fallback.id,
        status: "active",
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function addLabel(data: WorkData, name: string, color: LabelColor): { data: WorkData; label: WorkLabel } {
  const label: WorkLabel = {
    id: uid(),
    name,
    color,
  };

  return {
    data: {
      ...data,
      labels: [...data.labels, label],
    },
    label,
  };
}

export function updateLabel(data: WorkData, id: string, patch: Partial<Pick<WorkLabel, "name" | "color">>): WorkData {
  return {
    ...data,
    labels: data.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
  };
}

export function removeLabel(data: WorkData, id: string): WorkData {
  return {
    ...data,
    labels: data.labels.filter((l) => l.id !== id),
    cards: data.cards.map((card) => ({
      ...card,
      labelIds: card.labelIds.filter((x) => x !== id),
      updatedAt: new Date().toISOString(),
    })),
  };
}

export function addSprint(data: WorkData, workspaceId: string, name: string, goal?: string): { data: WorkData; sprint: Sprint } {
  const sprint: Sprint = {
    id: uid(),
    workspaceId,
    name,
    goal,
    state: "planned",
    createdAt: new Date().toISOString(),
  };

  return {
    data: {
      ...data,
      sprints: [...data.sprints, sprint],
    },
    sprint,
  };
}

export function updateSprint(data: WorkData, id: string, patch: Partial<Sprint>): WorkData {
  return {
    ...data,
    sprints: data.sprints.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  };
}

export function startSprint(data: WorkData, id: string): WorkData {
  return {
    ...data,
    sprints: data.sprints.map((s) =>
      s.id === id ? { ...s, state: "active", startDate: s.startDate ?? new Date().toISOString() } : s,
    ),
  };
}

export function completeSprint(data: WorkData, id: string, moveUnfinishedToBacklog = true): WorkData {
  const sprint = data.sprints.find((s) => s.id === id);
  if (!sprint) return data;

  const doneCol = data.columns
    .filter((c) => c.workspaceId === sprint.workspaceId)
    .sort((a, b) => b.order - a.order)[0];

  return {
    ...data,
    sprints: data.sprints.map((s) =>
      s.id === id ? { ...s, state: "completed", endDate: new Date().toISOString() } : s,
    ),
    cards: data.cards.map((card) => {
      if (card.sprintId !== id) return card;
      if (doneCol && card.columnId === doneCol.id) return card;
      if (!moveUnfinishedToBacklog) return card;
      return { ...card, sprintId: null, status: "backlog", updatedAt: new Date().toISOString() };
    }),
  };
}

export function removeSprint(data: WorkData, id: string): WorkData {
  return {
    ...data,
    sprints: data.sprints.filter((s) => s.id !== id),
    cards: data.cards.map((card) =>
      card.sprintId === id ? { ...card, sprintId: null, updatedAt: new Date().toISOString() } : card,
    ),
  };
}

export function moveCard(data: WorkData, cardId: string, targetColumnId: string, targetIndex: number): WorkData {
  const card = data.cards.find((c) => c.id === cardId);
  if (!card) return data;

  const sourceColId = card.columnId;
  const wsId = card.workspaceId;

  const targetCards = data.cards
    .filter((c) => c.workspaceId === wsId && c.columnId === targetColumnId && c.id !== cardId)
    .sort((a, b) => a.order - b.order);

  const moved: WorkCard = {
    ...card,
    columnId: targetColumnId,
    status: "active",
    updatedAt: new Date().toISOString(),
  };

  const clamped = Math.max(0, Math.min(targetIndex, targetCards.length));
  const newTarget = [...targetCards];
  newTarget.splice(clamped, 0, moved);

  const sourceCards = data.cards
    .filter((c) => c.workspaceId === wsId && c.columnId === sourceColId && c.id !== cardId)
    .sort((a, b) => a.order - b.order);

  const updated = new Map<string, WorkCard>();
  newTarget.forEach((c, i) => updated.set(c.id, { ...c, order: i }));
  if (sourceColId !== targetColumnId) {
    sourceCards.forEach((c, i) => updated.set(c.id, { ...c, order: i }));
  }

  return {
    ...data,
    cards: data.cards.map((c) => updated.get(c.id) ?? c),
  };
}
