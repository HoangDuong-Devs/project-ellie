import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LABEL_COLORS, type LabelColor } from "@/types/work";
import { cn } from "@/lib/utils";

const ICONS = ["🚀", "💼", "🎯", "🧠", "🎨", "🛠️", "📚", "💡", "🌱", "🔥"];
const COLORS: LabelColor[] = ["pink", "red", "orange", "yellow", "green", "cyan", "blue", "purple"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: {
    name: string;
    icon?: string;
    color?: LabelColor;
    useSprints?: boolean;
    description?: string;
  }) => void;
  initial?: {
    name?: string;
    icon?: string;
    color?: LabelColor;
    useSprints?: boolean;
    description?: string;
  };
  title?: string;
}

export function WorkspaceForm({ open, onOpenChange, onSubmit, initial, title = "Tạo workspace mới" }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "🚀");
  const [color, setColor] = useState<LabelColor>(initial?.color ?? "pink");
  const [useSprints, setUseSprints] = useState(initial?.useSprints ?? false);

  const reset = () => {
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setIcon(initial?.icon ?? "🚀");
    setColor(initial?.color ?? "pink");
    setUseSprints(initial?.useSprints ?? false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tên workspace</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Dự án cá nhân"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Mô tả ngắn (tuỳ chọn)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Biểu tượng</label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border text-base transition",
                    icon === i ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Màu</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full ring-offset-2 transition",
                    LABEL_COLORS[c].dot,
                    color === c && "ring-2 ring-foreground",
                  )}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <input
              type="checkbox"
              checked={useSprints}
              onChange={(e) => setUseSprints(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Dùng Sprint (Scrum)</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bật để có Backlog, Sprint và Story Points. Tắt để chỉ dùng Kanban kiểu Trello.
              </p>
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Huỷ
          </button>
          <button
            disabled={!name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                icon,
                color,
                useSprints,
              })
            }
            className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-50"
          >
            Lưu
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
