import { Bug, BookOpen, CheckSquare, Calendar as CalendarIcon, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ISSUE_TYPE_LABELS,
  LABEL_COLORS,
  PRIORITY_LABELS,
  type WorkCard,
  type WorkLabel,
  type WorkPriority,
} from "@/types/work";

const TYPE_ICON = {
  task: { icon: CheckSquare, color: "text-blue-500" },
  story: { icon: BookOpen, color: "text-emerald-500" },
  bug: { icon: Bug, color: "text-rose-500" },
};

const PRIORITY_DOT: Record<WorkPriority, string> = {
  highest: "bg-rose-600",
  high: "bg-rose-400",
  medium: "bg-amber-400",
  low: "bg-sky-400",
  lowest: "bg-slate-400",
};

interface Props {
  card: WorkCard;
  labels: WorkLabel[];
  showSprintFields?: boolean;
  onClick?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

export function CardItem({ card, labels, showSprintFields, onClick, dragHandleProps, isDragging }: Props) {
  const cardLabels = labels.filter((l) => card.labelIds.includes(l.id));
  const TypeMeta = TYPE_ICON[card.type];
  const Icon = TypeMeta.icon;

  const subtaskTotal = card.subtasks.length;
  const subtaskDone = card.subtasks.filter((s) => s.done).length;

  const dueDate = card.dueDate ? new Date(card.dueDate) : null;
  const overdue = dueDate ? dueDate < new Date(new Date().setHours(0, 0, 0, 0)) : false;

  return (
    <div
      onClick={onClick}
      {...dragHandleProps}
      className={cn(
        "group cursor-pointer rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/50 hover:shadow-soft",
        isDragging && "opacity-40 ring-2 ring-primary",
      )}
    >
      {cardLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {cardLabels.map((l) => (
            <span
              key={l.id}
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                LABEL_COLORS[l.color].chip,
              )}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm font-medium leading-snug text-foreground">{card.title}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1" title={ISSUE_TYPE_LABELS[card.type]}>
          <Icon className={cn("h-3.5 w-3.5", TypeMeta.color)} />
        </span>

        <span
          className="flex items-center gap-1"
          title={`Ưu tiên: ${PRIORITY_LABELS[card.priority]}`}
        >
          <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[card.priority])} />
        </span>

        {dueDate && (
          <span
            className={cn(
              "flex items-center gap-1",
              overdue && "font-medium text-rose-600",
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {dueDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
          </span>
        )}

        {subtaskTotal > 0 && (
          <span className="flex items-center gap-1">
            <ListChecks className="h-3 w-3" />
            {subtaskDone}/{subtaskTotal}
          </span>
        )}

        {showSprintFields && card.storyPoints != null && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold">
            {card.storyPoints}
          </span>
        )}

        {card.assignee && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-gradient-brand text-[10px] font-semibold text-white">
            {card.assignee.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
