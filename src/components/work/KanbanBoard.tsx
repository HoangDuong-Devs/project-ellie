import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sprint, WorkCard, WorkColumn, WorkLabel } from "@/types/work";
import { CardItem } from "./CardItem";

interface Props {
  cards: WorkCard[];
  columns: WorkColumn[];
  labels: WorkLabel[];
  sprints: Sprint[];
  showSprintFields: boolean;
  activeSprintId?: string | null;
  onCardClick: (card: WorkCard) => void;
  onCreateCard: (columnId: string) => void;
  onMoveCard: (cardId: string, targetColumnId: string, targetIndex: number) => void;
  onAddColumn: () => void;
  onRenameColumn: (id: string, name: string) => void;
  onDeleteColumn: (id: string) => void;
}

export function KanbanBoard({
  cards,
  columns,
  labels,
  sprints,
  showSprintFields,
  activeSprintId,
  onCardClick,
  onCreateCard,
  onMoveCard,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, WorkCard[]>();
    sortedColumns.forEach((c) => map.set(c.id, []));
    cards.forEach((c) => {
      // Filter by sprint if showing sprint fields
      if (showSprintFields) {
        if (activeSprintId === undefined) {
          // no sprint mode at all
        } else if (activeSprintId === null) {
          // no active sprint - show all cards on board (active status, not backlog)
          if (c.status === "backlog") return;
        } else {
          if (c.sprintId !== activeSprintId) return;
        }
      } else {
        if (c.status === "backlog") return;
      }
      const list = map.get(c.columnId);
      if (list) list.push(c);
    });
    map.forEach((list) => list.sort((a, b) => a.order - b.order));
    return map;
  }, [cards, sortedColumns, showSprintFields, activeSprintId]);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) ?? null : null;

  const findColumnOfCard = (cardId: string): string | null => {
    for (const [colId, list] of cardsByColumn.entries()) {
      if (list.some((c) => c.id === cardId)) return colId;
    }
    return null;
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragOver = (_e: DragOverEvent) => {
    // visual hint only
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const sourceCol = findColumnOfCard(activeIdStr);
    if (!sourceCol) return;

    // Dropped on a column container
    let targetCol: string;
    let targetIndex: number;

    if (overIdStr.startsWith("col:")) {
      targetCol = overIdStr.slice(4);
      targetIndex = (cardsByColumn.get(targetCol) ?? []).length;
    } else {
      const overCol = findColumnOfCard(overIdStr);
      if (!overCol) return;
      targetCol = overCol;
      const list = cardsByColumn.get(targetCol) ?? [];
      const overIdx = list.findIndex((c) => c.id === overIdStr);
      const activeIdx = list.findIndex((c) => c.id === activeIdStr);

      if (sourceCol === targetCol && activeIdx !== -1 && overIdx !== -1) {
        // pure reorder within same column
        const reordered = arrayMove(list, activeIdx, overIdx);
        const newIdx = reordered.findIndex((c) => c.id === activeIdStr);
        targetIndex = newIdx;
      } else {
        targetIndex = overIdx === -1 ? list.length : overIdx;
      }
    }

    onMoveCard(activeIdStr, targetCol, targetIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto pb-2">
        {sortedColumns.map((col) => (
          <Column
            key={col.id}
            column={col}
            cards={cardsByColumn.get(col.id) ?? []}
            labels={labels}
            sprints={sprints}
            showSprintFields={showSprintFields}
            onCardClick={onCardClick}
            onCreateCard={() => onCreateCard(col.id)}
            onRename={(name) => onRenameColumn(col.id, name)}
            onDelete={() => onDeleteColumn(col.id)}
          />
        ))}

        <button
          onClick={onAddColumn}
          className="flex h-12 w-72 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Thêm cột
        </button>
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="rotate-2 opacity-90">
            <CardItem card={activeCard} labels={labels} showSprintFields={showSprintFields} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  column,
  cards,
  labels,
  showSprintFields,
  onCardClick,
  onCreateCard,
  onRename,
  onDelete,
}: {
  column: WorkColumn;
  cards: WorkCard[];
  labels: WorkLabel[];
  sprints: Sprint[];
  showSprintFields: boolean;
  onCardClick: (card: WorkCard) => void;
  onCreateCard: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${column.id}` });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl bg-muted/40 transition",
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim()) onRename(name.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (name.trim()) onRename(name.trim());
                setEditing(false);
              }
              if (e.key === "Escape") {
                setName(column.name);
                setEditing(false);
              }
            }}
            className="flex-1 rounded border border-primary bg-background px-1 py-0.5 text-sm font-semibold outline-none"
          />
        ) : (
          <h3 className="flex flex-1 items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {column.name}
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              {cards.length}
            </span>
          </h3>
        )}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                <button
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Pencil className="h-3.5 w-3.5" /> Đổi tên
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Xoá cột "${column.name}"? Card sẽ chuyển về cột khác.`)) {
                      onDelete();
                    }
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xoá cột
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
          {cards.map((c) => (
            <SortableCard
              key={c.id}
              card={c}
              labels={labels}
              showSprintFields={showSprintFields}
              onClick={() => onCardClick(c)}
            />
          ))}
        </div>
      </SortableContext>

      <button
        onClick={onCreateCard}
        className="m-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm text-muted-foreground transition hover:bg-background hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> Thêm card
      </button>
    </div>
  );
}

function SortableCard({
  card,
  labels,
  showSprintFields,
  onClick,
}: {
  card: WorkCard;
  labels: WorkLabel[];
  showSprintFields: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardItem
        card={card}
        labels={labels}
        showSprintFields={showSprintFields}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}
