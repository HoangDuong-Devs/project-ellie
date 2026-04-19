import { useEffect, useMemo, useState } from "react";
import {
  Bug,
  BookOpen,
  CheckSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/format";
import {
  ISSUE_TYPE_LABELS,
  LABEL_COLORS,
  PRIORITY_LABELS,
  type IssueType,
  type LabelColor,
  type Sprint,
  type SubTask,
  type WorkCard,
  type WorkColumn,
  type WorkLabel,
  type WorkPriority,
} from "@/types/work";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card: WorkCard | null;
  isNew?: boolean;
  columns: WorkColumn[];
  labels: WorkLabel[];
  sprints: Sprint[];
  showSprintFields: boolean;
  onSave: (patch: Partial<WorkCard>) => void;
  onDelete?: () => void;
  onCreateLabel: (name: string, color: LabelColor) => string;
}

const TYPE_OPTIONS: { value: IssueType; label: string; icon: typeof CheckSquare; color: string }[] = [
  { value: "task", label: "Task", icon: CheckSquare, color: "text-blue-500" },
  { value: "story", label: "Story", icon: BookOpen, color: "text-emerald-500" },
  { value: "bug", label: "Bug", icon: Bug, color: "text-rose-500" },
];

const PRIORITY_OPTIONS: WorkPriority[] = ["highest", "high", "medium", "low", "lowest"];
const LABEL_COLOR_KEYS: LabelColor[] = ["pink", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "gray"];

export function CardEditor({
  open,
  onOpenChange,
  card,
  isNew,
  columns,
  labels,
  sprints,
  showSprintFields,
  onSave,
  onDelete,
  onCreateLabel,
}: Props) {
  const [draft, setDraft] = useState<WorkCard | null>(card);

  useEffect(() => {
    setDraft(card);
  }, [card?.id, open]);

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);

  if (!draft) return null;

  const update = (patch: Partial<WorkCard>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const toggleLabel = (id: string) => {
    const has = draft.labelIds.includes(id);
    update({ labelIds: has ? draft.labelIds.filter((x) => x !== id) : [...draft.labelIds, id] });
  };

  const addSubtask = () => {
    const sub: SubTask = { id: uid(), title: "", done: false };
    update({ subtasks: [...draft.subtasks, sub] });
  };

  const updateSubtask = (id: string, patch: Partial<SubTask>) => {
    update({ subtasks: draft.subtasks.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };

  const removeSubtask = (id: string) => {
    update({ subtasks: draft.subtasks.filter((s) => s.id !== id) });
  };

  const handleSave = () => {
    if (!draft.title.trim()) return;
    onSave({
      title: draft.title.trim(),
      description: draft.description,
      columnId: draft.columnId,
      priority: draft.priority,
      type: draft.type,
      labelIds: draft.labelIds,
      subtasks: draft.subtasks.filter((s) => s.title.trim()),
      dueDate: draft.dueDate || undefined,
      storyPoints: draft.storyPoints,
      sprintId: draft.sprintId,
      assignee: draft.assignee || undefined,
      status: draft.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Tạo card mới" : "Chi tiết card"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px]">
          {/* Main */}
          <div className="space-y-4">
            <input
              autoFocus={isNew}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Tiêu đề card…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base font-medium outline-none focus:border-primary"
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Mô tả</label>
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => update({ description: e.target.value })}
                rows={4}
                placeholder="Mô tả chi tiết, link, ghi chú…"
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Subtasks</label>
                <button
                  onClick={addSubtask}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> Thêm
                </button>
              </div>
              {draft.subtasks.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">Chưa có subtask</p>
              ) : (
                <div className="space-y-1.5">
                  {draft.subtasks.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={s.done}
                        onChange={(e) => updateSubtask(s.id, { done: e.target.checked })}
                        className="h-4 w-4 accent-primary"
                      />
                      <input
                        value={s.title}
                        onChange={(e) => updateSubtask(s.id, { title: e.target.value })}
                        placeholder="Bước nhỏ…"
                        className={cn(
                          "flex-1 bg-transparent text-sm outline-none",
                          s.done && "line-through text-muted-foreground",
                        )}
                      />
                      <button
                        onClick={() => removeSubtask(s.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {draft.subtasks.length > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-brand transition-all"
                    style={{
                      width: `${(draft.subtasks.filter((s) => s.done).length / draft.subtasks.length) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>

            <LabelsField
              labels={labels}
              selected={draft.labelIds}
              onToggle={toggleLabel}
              onCreate={onCreateLabel}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            <Field label="Cột">
              <select
                value={draft.columnId}
                onChange={(e) => update({ columnId: e.target.value, status: "active" })}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              >
                {sortedColumns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Loại">
              <div className="flex gap-1">
                {TYPE_OPTIONS.map((o) => {
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.value}
                      onClick={() => update({ type: o.value })}
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-md border py-1.5 text-xs",
                        draft.type === o.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted",
                      )}
                      title={o.label}
                    >
                      <Icon className={cn("h-3.5 w-3.5", o.color)} />
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Ưu tiên">
              <select
                value={draft.priority}
                onChange={(e) => update({ priority: e.target.value as WorkPriority })}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Hạn">
              <input
                type="date"
                value={draft.dueDate?.slice(0, 10) ?? ""}
                onChange={(e) => update({ dueDate: e.target.value || undefined })}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </Field>

            <Field label="Người làm">
              <input
                value={draft.assignee ?? ""}
                onChange={(e) => update({ assignee: e.target.value })}
                placeholder="Tên…"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </Field>

            {showSprintFields && (
              <>
                <Field label="Story Points">
                  <input
                    type="number"
                    min={0}
                    value={draft.storyPoints ?? ""}
                    onChange={(e) =>
                      update({ storyPoints: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                  />
                </Field>

                <Field label="Sprint">
                  <select
                    value={draft.sprintId ?? ""}
                    onChange={(e) => update({ sprintId: e.target.value || null })}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Backlog</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.state === "active" ? "🟢" : s.state === "completed" ? "✓" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div>
            {!isNew && onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Xoá
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Huỷ
            </button>
            <button
              disabled={!draft.title.trim()}
              onClick={handleSave}
              className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-50"
            >
              {isNew ? "Tạo" : "Lưu"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function LabelsField({
  labels,
  selected,
  onToggle,
  onCreate,
}: {
  labels: WorkLabel[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreate: (name: string, color: LabelColor) => string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>("blue");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Nhãn</label>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3 w-3" /> Thêm nhãn
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {labels.map((l) => {
          const active = selected.includes(l.id);
          return (
            <button
              key={l.id}
              onClick={() => onToggle(l.id)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition",
                LABEL_COLORS[l.color].chip,
                active ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100",
              )}
            >
              {l.name}
            </button>
          );
        })}
        {labels.length === 0 && !adding && (
          <p className="text-xs italic text-muted-foreground">Chưa có nhãn</p>
        )}
      </div>

      {adding && (
        <div className="mt-2 space-y-2 rounded-lg border border-border p-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên nhãn…"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
          <div className="flex flex-wrap gap-1">
            {LABEL_COLOR_KEYS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "h-5 w-5 rounded-full",
                  LABEL_COLORS[c].dot,
                  color === c && "ring-2 ring-foreground ring-offset-1",
                )}
              />
            ))}
          </div>
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => {
                setAdding(false);
                setName("");
              }}
              className="rounded-md px-2 py-1 text-xs hover:bg-muted"
            >
              Huỷ
            </button>
            <button
              disabled={!name.trim()}
              onClick={() => {
                onCreate(name.trim(), color);
                setName("");
                setAdding(false);
              }}
              className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              Tạo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
