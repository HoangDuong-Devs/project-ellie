import { useMemo, useState, useEffect } from "react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useWorkStore } from "@/hooks/useWorkStore";
import { WorkspaceSidebar } from "@/components/work/WorkspaceSidebar";
import { KanbanBoard } from "@/components/work/KanbanBoard";
import { BacklogView } from "@/components/work/BacklogView";
import { WorkspaceSettings } from "@/components/work/WorkspaceSettings";
import { CardEditor } from "@/components/work/CardEditor";
import { uid } from "@/lib/format";
import type { WorkCard } from "@/types/work";

type WorkSearch = {
  ws?: string;
  view?: "board" | "backlog" | "settings";
  sprint?: string;
};

export const Route = createFileRoute("/app/work")({
  validateSearch: (search: Record<string, unknown>): WorkSearch => ({
    ws: typeof search.ws === "string" ? search.ws : undefined,
    view:
      search.view === "board" || search.view === "backlog" || search.view === "settings"
        ? search.view
        : undefined,
    sprint: typeof search.sprint === "string" ? search.sprint : undefined,
  }),
  component: WorkPage,
});

function WorkPage() {
  const search = useSearch({ from: "/app/work" });
  const navigate = useNavigate({ from: "/app/work" });
  const store = useWorkStore();
  const { data } = store;

  const activeWorkspace = useMemo(() => {
    return data.workspaces.find((w) => w.id === search.ws) ?? data.workspaces[0];
  }, [data.workspaces, search.ws]);

  // Sync URL with default workspace
  useEffect(() => {
    if (activeWorkspace && (!search.ws || search.ws !== activeWorkspace.id)) {
      navigate({
        search: { ...search, ws: activeWorkspace.id },
        replace: true,
      });
    }
  }, [activeWorkspace, search.ws, navigate]);

  const view: "board" | "backlog" | "settings" = search.view ?? "board";

  // Filter data by active workspace
  const wsColumns = useMemo(
    () => data.columns.filter((c) => c.workspaceId === activeWorkspace?.id),
    [data.columns, activeWorkspace?.id],
  );
  const wsCards = useMemo(
    () => data.cards.filter((c) => c.workspaceId === activeWorkspace?.id),
    [data.cards, activeWorkspace?.id],
  );
  const wsSprints = useMemo(
    () => data.sprints.filter((s) => s.workspaceId === activeWorkspace?.id),
    [data.sprints, activeWorkspace?.id],
  );

  // Active sprint for board (when sprint mode)
  const activeSprint = useMemo(() => {
    if (!activeWorkspace?.useSprints) return null;
    if (search.sprint) return wsSprints.find((s) => s.id === search.sprint) ?? null;
    return wsSprints.find((s) => s.state === "active") ?? null;
  }, [activeWorkspace?.useSprints, search.sprint, wsSprints]);

  // Card editor state
  const [editingCard, setEditingCard] = useState<WorkCard | null>(null);
  const [isNewCard, setIsNewCard] = useState(false);

  if (!activeWorkspace) {
    return (
      <div className="py-20 text-center text-muted-foreground">Đang khởi tạo workspace…</div>
    );
  }

  const openNewCard = (columnId?: string, sprintId?: string | null) => {
    const colId =
      columnId ?? wsColumns.sort((a, b) => a.order - b.order)[0]?.id ?? "";
    const draft: WorkCard = {
      id: uid(),
      workspaceId: activeWorkspace.id,
      title: "",
      columnId: colId,
      status: sprintId === null ? "backlog" : "active",
      priority: "medium",
      type: "task",
      labelIds: [],
      subtasks: [],
      sprintId: sprintId === undefined ? activeSprint?.id ?? null : sprintId,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingCard(draft);
    setIsNewCard(true);
  };

  const handleSaveCard = (patch: Partial<WorkCard>) => {
    if (!editingCard) return;
    if (isNewCard) {
      store.createCard({
        ...editingCard,
        ...patch,
        title: patch.title || editingCard.title,
      });
    } else {
      store.updateCard(editingCard.id, patch);
    }
    setEditingCard(null);
    setIsNewCard(false);
  };

  return (
    <div>
      <PageHeader
        title="Công việc"
        description="Quản lý dự án theo Kanban và Scrum, tách biệt theo workspace."
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Lưu cục bộ trên trình duyệt
          </div>
        }
      />

      <div className="flex h-[calc(100vh-220px)] min-h-[600px] overflow-hidden rounded-2xl border border-border bg-background shadow-soft">
        <WorkspaceSidebar
          workspaces={data.workspaces}
          activeId={activeWorkspace.id}
          view={view}
          onSelectWorkspace={(id) =>
            navigate({ search: { ...search, ws: id, sprint: undefined } })
          }
          onSelectView={(v) =>
            navigate({ search: { ...search, view: v } })
          }
          onCreate={async (d) => {
            const newId = await store.createWorkspace(d);
            if (!newId) return;
            navigate({ search: { ...search, ws: newId, view: "board" } });
          }}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-border bg-card/30 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">{activeWorkspace.icon}</span>
              <span className="font-semibold">{activeWorkspace.name}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground capitalize">
                {view === "board" ? "Bảng" : view === "backlog" ? "Backlog" : "Cài đặt"}
              </span>
            </div>

            {view === "board" && activeWorkspace.useSprints && wsSprints.length > 0 && (
              <select
                value={activeSprint?.id ?? ""}
                onChange={(e) =>
                  navigate({
                    search: { ...search, sprint: e.target.value || undefined },
                  })
                }
                className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
              >
                <option value="">Sprint đang chạy</option>
                {wsSprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{" "}
                    {s.state === "active" ? "(đang chạy)" : s.state === "completed" ? "(xong)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex-1 overflow-auto p-3">
            {view === "board" && (
              <KanbanBoard
                cards={wsCards}
                columns={wsColumns}
                labels={data.labels}
                sprints={wsSprints}
                showSprintFields={activeWorkspace.useSprints}
                activeSprintId={activeWorkspace.useSprints ? activeSprint?.id ?? null : undefined}
                onCardClick={(c) => {
                  setEditingCard(c);
                  setIsNewCard(false);
                }}
                onCreateCard={(colId) => openNewCard(colId, activeSprint?.id ?? null)}
                onMoveCard={store.moveCard}
                onAddColumn={() => {
                  const name = prompt("Tên cột mới:");
                  if (name?.trim()) store.addColumn(activeWorkspace.id, name.trim());
                }}
                onRenameColumn={store.renameColumn}
                onDeleteColumn={store.deleteColumn}
              />
            )}

            {view === "backlog" && activeWorkspace.useSprints && (
              <BacklogView
                cards={wsCards}
                columns={wsColumns}
                labels={data.labels}
                sprints={wsSprints}
                onCardClick={(c) => {
                  setEditingCard(c);
                  setIsNewCard(false);
                }}
                onCreateCard={(sprintId) => openNewCard(undefined, sprintId)}
                onMoveCardToSprint={(cardId, sprintId) =>
                  store.updateCard(cardId, {
                    sprintId,
                    status: sprintId === null ? "backlog" : "active",
                  })
                }
                onCreateSprint={() => {
                  const name = prompt("Tên sprint:", `Sprint ${wsSprints.length + 1}`);
                  if (name?.trim()) store.createSprint(activeWorkspace.id, name.trim());
                }}
                onStartSprint={store.startSprint}
                onCompleteSprint={(id) => store.completeSprint(id, { moveUnfinishedToBacklog: true })}
                onDeleteSprint={store.deleteSprint}
                onUpdateSprint={store.updateSprint}
              />
            )}

            {view === "settings" && (
              <WorkspaceSettings
                workspace={activeWorkspace}
                onUpdate={(patch) => store.updateWorkspace(activeWorkspace.id, patch)}
                onDelete={() => {
                  store.deleteWorkspace(activeWorkspace.id);
                  navigate({ search: () => ({}), replace: true });
                }}
                canDelete={data.workspaces.length > 1}
              />
            )}
          </div>
        </div>
      </div>

      <CardEditor
        open={!!editingCard}
        onOpenChange={(v) => {
          if (!v) {
            setEditingCard(null);
            setIsNewCard(false);
          }
        }}
        card={editingCard}
        isNew={isNewCard}
        columns={wsColumns}
        labels={data.labels}
        sprints={wsSprints}
        showSprintFields={activeWorkspace.useSprints}
        onSave={handleSaveCard}
        onDelete={
          editingCard && !isNewCard
            ? () => {
                if (confirm("Xoá card?")) {
                  store.deleteCard(editingCard.id);
                  setEditingCard(null);
                }
              }
            : undefined
        }
        onCreateLabel={store.createLabel}
      />
    </div>
  );
}
