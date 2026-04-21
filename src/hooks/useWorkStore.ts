import { useCallback, useEffect, useMemo, useState } from "react";
import { useDataAutoRefresh } from "@/services/api-live-sync";
import {
  completeSprint as completeSprintApi,
  createCard as createCardApi,
  createColumn as createColumnApi,
  createLabel as createLabelApi,
  createSprint as createSprintApi,
  createWorkspace as createWorkspaceApi,
  deleteCard as deleteCardApi,
  deleteColumn as deleteColumnApi,
  deleteLabel as deleteLabelApi,
  deleteSprint as deleteSprintApi,
  deleteWorkspace as deleteWorkspaceApi,
  getWorkData,
  moveCard as moveCardApi,
  patchCard as patchCardApi,
  patchColumn as patchColumnApi,
  patchSprint as patchSprintApi,
  patchWorkspace as patchWorkspaceApi,
  startSprint as startSprintApi,
} from "@/services/work-api-client";
import { ensureWorkData, makeDefaultWorkData } from "@/services/work-service";
import { type LabelColor, type Sprint, type WorkCard, type WorkData, type Workspace } from "@/types/work";

export function useWorkStore() {
  const [data, setData] = useState<WorkData>(makeDefaultWorkData());

  const refresh = useCallback(async () => {
    const res = await getWorkData();
    setData(ensureWorkData(res.data));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useDataAutoRefresh(refresh, "work");

  const safeData = useMemo(() => ensureWorkData(data), [data]);

  const createWorkspace = useCallback(
    async (input: {
      name: string;
      icon?: string;
      color?: LabelColor;
      useSprints?: boolean;
      description?: string;
    }) => {
      const res = await createWorkspaceApi(input);
      await refresh();
      return res.workspace?.id ?? "";
    },
    [refresh],
  );

  const updateWorkspace = useCallback(async (id: string, patch: Partial<Workspace>) => {
    const res = await patchWorkspaceApi(id, patch);
    setData((prev) => ({ ...prev, workspaces: res.workspaces }));
  }, []);

  const deleteWorkspace = useCallback(
    async (id: string) => {
      await deleteWorkspaceApi(id);
      await refresh();
    },
    [refresh],
  );

  const addColumn = useCallback(async (workspaceId: string, name: string) => {
    const res = await createColumnApi(workspaceId, name);
    setData((prev) => ({ ...prev, columns: res.columns }));
  }, []);

  const renameColumn = useCallback(async (id: string, name: string) => {
    const res = await patchColumnApi(id, { name });
    setData((prev) => ({ ...prev, columns: res.columns }));
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    const res = await deleteColumnApi(id);
    setData((prev) => ({
      ...prev,
      columns: res.columns,
      cards: res.cards ?? prev.cards,
    }));
  }, []);

  const createCard = useCallback(
    async (input: Partial<WorkCard> & { workspaceId: string; title: string; columnId?: string }) => {
      const res = await createCardApi(input);
      setData((prev) => ({ ...prev, cards: res.cards }));
      return res.card?.id ?? "";
    },
    [],
  );

  const updateCard = useCallback(async (id: string, patch: Partial<WorkCard>) => {
    const res = await patchCardApi(id, patch);
    setData((prev) => ({ ...prev, cards: res.cards }));
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    const res = await deleteCardApi(id);
    setData((prev) => ({ ...prev, cards: res.cards }));
  }, []);

  const moveCard = useCallback(async (cardId: string, targetColumnId: string, targetIndex: number) => {
    const res = await moveCardApi(cardId, targetColumnId, targetIndex);
    setData((prev) => ({ ...prev, cards: res.cards }));
  }, []);

  const createLabel = useCallback(async (name: string, color: LabelColor) => {
    const res = await createLabelApi(name, color);
    setData((prev) => ({ ...prev, labels: res.labels }));
    return res.label?.id ?? "";
  }, []);

  const deleteLabel = useCallback(async (id: string) => {
    const res = await deleteLabelApi(id);
    setData((prev) => ({
      ...prev,
      labels: res.labels,
      cards: res.cards ?? prev.cards,
    }));
  }, []);

  const createSprint = useCallback(async (workspaceId: string, name: string, goal?: string) => {
    const res = await createSprintApi(workspaceId, name, goal);
    setData((prev) => ({ ...prev, sprints: res.sprints }));
    return res.sprint?.id ?? "";
  }, []);

  const updateSprint = useCallback(async (id: string, patch: Partial<Sprint>) => {
    const res = await patchSprintApi(id, patch);
    setData((prev) => ({ ...prev, sprints: res.sprints }));
  }, []);

  const startSprint = useCallback(async (id: string) => {
    const res = await startSprintApi(id);
    setData((prev) => ({ ...prev, sprints: res.sprints }));
  }, []);

  const completeSprint = useCallback(
    async (id: string, opts?: { moveUnfinishedToBacklog?: boolean }) => {
      const res = await completeSprintApi(id, opts?.moveUnfinishedToBacklog ?? true);
      setData((prev) => ({
        ...prev,
        sprints: res.sprints,
        cards: res.cards ?? prev.cards,
      }));
    },
    [],
  );

  const deleteSprint = useCallback(async (id: string) => {
    const res = await deleteSprintApi(id);
    setData((prev) => ({
      ...prev,
      sprints: res.sprints,
      cards: res.cards ?? prev.cards,
    }));
  }, []);

  return {
    data: safeData,
    refresh,
    setData,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    addColumn,
    renameColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    createLabel,
    deleteLabel,
    createSprint,
    updateSprint,
    startSprint,
    completeSprint,
    deleteSprint,
  };
}
