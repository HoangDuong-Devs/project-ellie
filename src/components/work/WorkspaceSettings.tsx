import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LABEL_COLORS, type LabelColor, type Workspace } from "@/types/work";

const ICONS = ["🚀", "💼", "🎯", "🧠", "🎨", "🛠️", "📚", "💡", "🌱", "🔥"];
const COLORS: LabelColor[] = ["pink", "red", "orange", "yellow", "green", "cyan", "blue", "purple"];

interface Props {
  workspace: Workspace;
  onUpdate: (patch: Partial<Workspace>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function WorkspaceSettings({ workspace, onUpdate, onDelete, canDelete }: Props) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? "");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Cài đặt workspace</h2>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <Field label="Tên">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== workspace.name && onUpdate({ name: name.trim() })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="Mô tả">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (workspace.description ?? "") && onUpdate({ description: description.trim() || undefined })}
            rows={2}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="Biểu tượng">
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((i) => (
              <button
                key={i}
                onClick={() => onUpdate({ icon: i })}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border text-base transition",
                  workspace.icon === i ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Màu">
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onUpdate({ color: c })}
                className={cn(
                  "h-7 w-7 rounded-full",
                  LABEL_COLORS[c].dot,
                  workspace.color === c && "ring-2 ring-foreground ring-offset-2",
                )}
              />
            ))}
          </div>
        </Field>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <input
            type="checkbox"
            checked={workspace.useSprints}
            onChange={(e) => onUpdate({ useSprints: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <div className="flex-1">
            <div className="text-sm font-medium">Dùng Sprint (Scrum)</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bật để có Backlog, Sprint, Story Points. Tắt thì chỉ dùng Kanban đơn giản. Bạn có thể bật/tắt bất kỳ lúc nào — dữ liệu cũ vẫn được giữ.
            </p>
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" /> Vùng nguy hiểm
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Xoá workspace sẽ xoá toàn bộ card, cột và sprint trong workspace này.
        </p>
        <button
          disabled={!canDelete}
          onClick={() => {
            if (confirm(`Xoá workspace "${workspace.name}"? Hành động không hoàn tác.`)) onDelete();
          }}
          className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" /> Xoá workspace
        </button>
        {!canDelete && (
          <p className="mt-2 text-xs text-muted-foreground">Phải còn ít nhất 1 workspace.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
