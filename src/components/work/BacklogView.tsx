import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Play, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sprint, WorkCard, WorkColumn, WorkLabel } from "@/types/work";
import { CardItem } from "./CardItem";

interface Props {
  cards: WorkCard[];
  columns: WorkColumn[];
  labels: WorkLabel[];
  sprints: Sprint[];
  onCardClick: (card: WorkCard) => void;
  onCreateCard: (sprintId: string | null) => void;
  onMoveCardToSprint: (cardId: string, sprintId: string | null) => void;
  onCreateSprint: () => void;
  onStartSprint: (id: string) => void;
  onCompleteSprint: (id: string) => void;
  onDeleteSprint: (id: string) => void;
  onUpdateSprint: (id: string, patch: Partial<Sprint>) => void;
}

export function BacklogView({
  cards,
  columns,
  labels,
  sprints,
  onCardClick,
  onCreateCard,
  onMoveCardToSprint,
  onCreateSprint,
  onStartSprint,
  onCompleteSprint,
  onDeleteSprint,
  onUpdateSprint,
}: Props) {
  const doneCol = useMemo(
    () => [...columns].sort((a, b) => b.order - a.order)[0],
    [columns],
  );

  const sprintCards = (sprintId: string | null) =>
    cards.filter((c) => (sprintId === null ? c.sprintId == null : c.sprintId === sprintId));

  const sortedSprints = useMemo(() => {
    const order = { active: 0, planned: 1, completed: 2 };
    return [...sprints].sort((a, b) => order[a.state] - order[b.state]);
  }, [sprints]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Backlog & Sprints</h2>
        <button
          onClick={onCreateSprint}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-brand px-3 py-1.5 text-sm font-medium text-white shadow-soft"
        >
          <Plus className="h-4 w-4" /> Tạo sprint
        </button>
      </div>

      {sortedSprints.map((s) => (
        <SprintSection
          key={s.id}
          sprint={s}
          cards={sprintCards(s.id)}
          totalPoints={sprintCards(s.id).reduce((sum, c) => sum + (c.storyPoints ?? 0), 0)}
          donePoints={sprintCards(s.id)
            .filter((c) => c.columnId === doneCol?.id)
            .reduce((sum, c) => sum + (c.storyPoints ?? 0), 0)}
          labels={labels}
          onCardClick={onCardClick}
          onCreateCard={() => onCreateCard(s.id)}
          onStart={() => onStartSprint(s.id)}
          onComplete={() => onCompleteSprint(s.id)}
          onDelete={() => onDeleteSprint(s.id)}
          onUpdate={(patch) => onUpdateSprint(s.id, patch)}
          onMoveCard={onMoveCardToSprint}
          allSprints={sprints}
        />
      ))}

      <SprintSection
        sprint={null}
        cards={sprintCards(null)}
        totalPoints={sprintCards(null).reduce((sum, c) => sum + (c.storyPoints ?? 0), 0)}
        donePoints={0}
        labels={labels}
        onCardClick={onCardClick}
        onCreateCard={() => onCreateCard(null)}
        onMoveCard={onMoveCardToSprint}
        allSprints={sprints}
      />
    </div>
  );
}

function SprintSection({
  sprint,
  cards,
  totalPoints,
  donePoints,
  labels,
  onCardClick,
  onCreateCard,
  onStart,
  onComplete,
  onDelete,
  onUpdate,
  onMoveCard,
  allSprints,
}: {
  sprint: Sprint | null;
  cards: WorkCard[];
  totalPoints: number;
  donePoints: number;
  labels: WorkLabel[];
  onCardClick: (card: WorkCard) => void;
  onCreateCard: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
  onUpdate?: (patch: Partial<Sprint>) => void;
  onMoveCard: (cardId: string, sprintId: string | null) => void;
  allSprints: Sprint[];
}) {
  const [open, setOpen] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(sprint?.name ?? "");

  const stateBadge = sprint
    ? sprint.state === "active"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : sprint.state === "completed"
        ? "bg-slate-100 text-slate-600 border-slate-200"
        : "bg-amber-100 text-amber-800 border-amber-200"
    : "";

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {sprint ? (
          editingName && onUpdate ? (
            <input
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={() => {
                if (tempName.trim()) onUpdate({ name: tempName.trim() });
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (tempName.trim()) onUpdate({ name: tempName.trim() });
                  setEditingName(false);
                }
                if (e.key === "Escape") setEditingName(false);
              }}
              className="rounded border border-primary bg-background px-1 py-0.5 text-sm font-semibold outline-none"
            />
          ) : (
            <button
              onClick={() => {
                if (sprint.state !== "completed" && onUpdate) {
                  setTempName(sprint.name);
                  setEditingName(true);
                }
              }}
              className="font-semibold"
            >
              {sprint.name}
            </button>
          )
        ) : (
          <h3 className="font-semibold">Backlog</h3>
        )}

        {sprint && (
          <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase", stateBadge)}>
            {sprint.state === "active" ? "Đang chạy" : sprint.state === "completed" ? "Đã xong" : "Lên kế hoạch"}
          </span>
        )}

        <span className="text-xs text-muted-foreground">
          {cards.length} card{totalPoints > 0 && ` · ${donePoints}/${totalPoints} pts`}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {sprint?.state === "planned" && onStart && (
            <button
              onClick={onStart}
              className="flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600"
            >
              <Play className="h-3 w-3" /> Bắt đầu
            </button>
          )}
          {sprint?.state === "active" && onComplete && (
            <button
              onClick={() => {
                if (confirm("Hoàn thành sprint? Card chưa xong sẽ chuyển về backlog.")) onComplete();
              }}
              className="flex items-center gap-1 rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
            >
              <CheckCircle2 className="h-3 w-3" /> Hoàn thành
            </button>
          )}
          {sprint && sprint.state !== "active" && onDelete && (
            <button
              onClick={() => {
                if (confirm(`Xoá sprint "${sprint.name}"?`)) onDelete();
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {open && (
        <div className="space-y-1.5 border-t border-border p-3">
          {cards.length === 0 ? (
            <p className="py-4 text-center text-xs italic text-muted-foreground">
              {sprint ? "Chưa có card trong sprint này" : "Backlog trống"}
            </p>
          ) : (
            cards.map((c) => (
              <BacklogRow
                key={c.id}
                card={c}
                labels={labels}
                allSprints={allSprints}
                currentSprintId={sprint?.id ?? null}
                onClick={() => onCardClick(c)}
                onMove={(sid) => onMoveCard(c.id, sid)}
              />
            ))
          )}
          <button
            onClick={onCreateCard}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm card
          </button>
        </div>
      )}
    </section>
  );
}

function BacklogRow({
  card,
  labels,
  allSprints,
  currentSprintId,
  onClick,
  onMove,
}: {
  card: WorkCard;
  labels: WorkLabel[];
  allSprints: Sprint[];
  currentSprintId: string | null;
  onClick: () => void;
  onMove: (sprintId: string | null) => void;
}) {
  const moveable = allSprints.filter((s) => s.state !== "completed" && s.id !== currentSprintId);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <CardItem card={card} labels={labels} showSprintFields onClick={onClick} />
      </div>
      <select
        value={currentSprintId ?? ""}
        onChange={(e) => onMove(e.target.value || null)}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
        title="Chuyển sang sprint"
      >
        <option value="">Backlog</option>
        {currentSprintId &&
          allSprints
            .filter((s) => s.id === currentSprintId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        {moveable.map((s) => (
          <option key={s.id} value={s.id}>
            → {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
