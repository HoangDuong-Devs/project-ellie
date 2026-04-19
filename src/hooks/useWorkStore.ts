import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { uid } from "@/lib/format";
import {
  DEFAULT_COLUMN_NAMES,
  type LabelColor,
  type Sprint,
  type WorkCard,
  type WorkColumn,
  type WorkData,
  type WorkLabel,
  type Workspace,
} from "@/types/work";

const STORAGE_KEY = "ellie:work:v1";

function makeDefaultData(): WorkData {
  const wsId = uid();
  const now = new Date().toISOString();
  const columns: WorkColumn[] = DEFAULT_COLUMN_NAMES.map((name, i) => ({
    id: uid(),
    workspaceId: wsId,
    name,
    order: i,
  }));
  const labels: WorkLabel[] = [
    { id: uid(), name: "Frontend", color: "blue" },
    { id: uid(), name: "Bug", color: "red" },
    { id: uid(), name: "Idea", color: "purple" },
  ];
  const ws: Workspace = {
    id: wsId,
    name: "Workspace của tôi",
    description: "Workspace mặc định",
    icon: "🚀",
    color: "pink",
    useSprints: false,
    createdAt: now,
  };
  return { workspaces: [ws], columns, cards: [], labels, sprints: [] };
}

export function useWorkStore() {
  const [data, setData] = useLocalStorage<WorkData>(STORAGE_KEY, makeDefaultData());

  // Self-heal: if all workspaces deleted somehow, recreate
  const safeData = useMemo(() => {
    if (!data.workspaces || data.workspaces.length === 0) return makeDefaultData();
    return data;
  }, [data]);

  const update = useCallback(
    (fn: (d: WorkData) => WorkData) => setData((prev) => fn(prev)),
    [setData],
  );

  // ===== Workspaces =====
  const createWorkspace = useCallback(
    (input: { name: string; icon?: string; color?: LabelColor; useSprints?: boolean; description?: string }) => {
      const id = uid();
      const now = new Date().toISOString();
      const cols: WorkColumn[] = DEFAULT_COLUMN_NAMES.map((name, i) => ({
        id: uid(),
        workspaceId: id,
        name,
        order: i,
      }));
      update((d) => ({
        ...d,
        workspaces: [
          ...d.workspaces,
          {
            id,
            name: input.name,
            description: input.description,
            icon: input.icon ?? "📁",
            color: input.color ?? "pink",
            useSprints: input.useSprints ?? false,
            createdAt: now,
          },
        ],
        columns: [...d.columns, ...cols],
      }));
      return id;
    },
    [update],
  );

  const updateWorkspace = useCallback(
    (id: string, patch: Partial<Workspace>) =>
      update((d) => ({
        ...d,
        workspaces: d.workspaces.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      })),
    [update],
  );

  const deleteWorkspace = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        workspaces: d.workspaces.filter((w) => w.id !== id),
        columns: d.columns.filter((c) => c.workspaceId !== id),
        cards: d.cards.filter((c) => c.workspaceId !== id),
        sprints: d.sprints.filter((s) => s.workspaceId !== id),
      })),
    [update],
  );

  // ===== Columns =====
  const addColumn = useCallback(
    (workspaceId: string, name: string) =>
      update((d) => {
        const order = d.columns.filter((c) => c.workspaceId === workspaceId).length;
        return {
          ...d,
          columns: [...d.columns, { id: uid(), workspaceId, name, order }],
        };
      }),
    [update],
  );

  const renameColumn = useCallback(
    (id: string, name: string) =>
      update((d) => ({
        ...d,
        columns: d.columns.map((c) => (c.id === id ? { ...c, name } : c)),
      })),
    [update],
  );

  const deleteColumn = useCallback(
    (id: string) =>
      update((d) => {
        const col = d.columns.find((c) => c.id === id);
        if (!col) return d;
        const remainingCols = d.columns.filter((c) => c.workspaceId === col.workspaceId && c.id !== id);
        const fallback = remainingCols.sort((a, b) => a.order - b.order)[0];
        return {
          ...d,
          columns: d.columns.filter((c) => c.id !== id),
          cards: d.cards.map((c) =>
            c.columnId === id
              ? fallback
                ? { ...c, columnId: fallback.id, status: "active" }
                : { ...c, status: "backlog" }
              : c,
          ),
        };
      }),
    [update],
  );

  // ===== Cards =====
  const createCard = useCallback(
    (input: Partial<WorkCard> & { workspaceId: string; title: string; columnId?: string }) => {
      const id = uid();
      const now = new Date().toISOString();
      update((d) => {
        const colId =
          input.columnId ??
          d.columns
            .filter((c) => c.workspaceId === input.workspaceId)
            .sort((a, b) => a.order - b.order)[0]?.id ??
          "";
        const order = d.cards.filter(
          (c) => c.workspaceId === input.workspaceId && c.columnId === colId,
        ).length;
        const card: WorkCard = {
          id,
          workspaceId: input.workspaceId,
          title: input.title,
          description: input.description,
          columnId: colId,
          status: input.status ?? (input.sprintId === undefined ? "active" : "active"),
          priority: input.priority ?? "medium",
          type: input.type ?? "task",
          labelIds: input.labelIds ?? [],
          subtasks: input.subtasks ?? [],
          dueDate: input.dueDate,
          storyPoints: input.storyPoints,
          sprintId: input.sprintId ?? null,
          assignee: input.assignee,
          order,
          createdAt: now,
          updatedAt: now,
        };
        return { ...d, cards: [...d.cards, card] };
      });
      return id;
    },
    [update],
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<WorkCard>) =>
      update((d) => ({
        ...d,
        cards: d.cards.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
        ),
      })),
    [update],
  );

  const deleteCard = useCallback(
    (id: string) => update((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) })),
    [update],
  );

  /**
   * Move a card to a target column at a target index.
   * Reorders both source and target columns.
   */
  const moveCard = useCallback(
    (cardId: string, targetColumnId: string, targetIndex: number) =>
      update((d) => {
        const card = d.cards.find((c) => c.id === cardId);
        if (!card) return d;
        const sourceColId = card.columnId;
        const wsId = card.workspaceId;

        // build new ordered list for target column (excluding moving card if same col)
        const targetCards = d.cards
          .filter(
            (c) => c.workspaceId === wsId && c.columnId === targetColumnId && c.id !== cardId,
          )
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

        // reorder source if different
        const sourceCards = d.cards
          .filter(
            (c) => c.workspaceId === wsId && c.columnId === sourceColId && c.id !== cardId,
          )
          .sort((a, b) => a.order - b.order);

        const updated = new Map<string, WorkCard>();
        newTarget.forEach((c, i) => updated.set(c.id, { ...c, order: i }));
        if (sourceColId !== targetColumnId) {
          sourceCards.forEach((c, i) => updated.set(c.id, { ...c, order: i }));
        }

        return {
          ...d,
          cards: d.cards.map((c) => updated.get(c.id) ?? c),
        };
      }),
    [update],
  );

  // ===== Labels =====
  const createLabel = useCallback(
    (name: string, color: LabelColor) => {
      const id = uid();
      update((d) => ({ ...d, labels: [...d.labels, { id, name, color }] }));
      return id;
    },
    [update],
  );

  const deleteLabel = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        labels: d.labels.filter((l) => l.id !== id),
        cards: d.cards.map((c) => ({ ...c, labelIds: c.labelIds.filter((x) => x !== id) })),
      })),
    [update],
  );

  // ===== Sprints =====
  const createSprint = useCallback(
    (workspaceId: string, name: string, goal?: string) => {
      const id = uid();
      const now = new Date().toISOString();
      const sprint: Sprint = { id, workspaceId, name, goal, state: "planned", createdAt: now };
      update((d) => ({ ...d, sprints: [...d.sprints, sprint] }));
      return id;
    },
    [update],
  );

  const updateSprint = useCallback(
    (id: string, patch: Partial<Sprint>) =>
      update((d) => ({ ...d, sprints: d.sprints.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
    [update],
  );

  const startSprint = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        sprints: d.sprints.map((s) =>
          s.id === id
            ? { ...s, state: "active", startDate: s.startDate ?? new Date().toISOString() }
            : s,
        ),
      })),
    [update],
  );

  const completeSprint = useCallback(
    (id: string, opts?: { moveUnfinishedToBacklog?: boolean }) =>
      update((d) => {
        const sprint = d.sprints.find((s) => s.id === id);
        if (!sprint) return d;
        // Find done column for this workspace
        const doneCol = d.columns
          .filter((c) => c.workspaceId === sprint.workspaceId)
          .sort((a, b) => b.order - a.order)[0];
        return {
          ...d,
          sprints: d.sprints.map((s) =>
            s.id === id ? { ...s, state: "completed", endDate: new Date().toISOString() } : s,
          ),
          cards: d.cards.map((c) => {
            if (c.sprintId !== id) return c;
            // Done cards stay; unfinished optionally move to backlog
            if (doneCol && c.columnId === doneCol.id) return c;
            if (opts?.moveUnfinishedToBacklog ?? true) {
              return { ...c, sprintId: null, status: "backlog" };
            }
            return c;
          }),
        };
      }),
    [update],
  );

  const deleteSprint = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        sprints: d.sprints.filter((s) => s.id !== id),
        cards: d.cards.map((c) => (c.sprintId === id ? { ...c, sprintId: null } : c)),
      })),
    [update],
  );

  return {
    data: safeData,
    setData,
    // workspace
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    // column
    addColumn,
    renameColumn,
    deleteColumn,
    // card
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    // label
    createLabel,
    deleteLabel,
    // sprint
    createSprint,
    updateSprint,
    startSprint,
    completeSprint,
    deleteSprint,
  };
}
