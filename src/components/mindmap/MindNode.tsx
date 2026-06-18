import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";
import { hueToColor } from "./layout";
import type { MindNodeData } from "@/types/mindmap";
import { cn } from "@/lib/utils";

type Props = NodeProps & {
  data: MindNodeData & {
    onAddChild?: (id: string) => void;
    onDelete?: (id: string) => void;
    onRename?: (id: string, label: string) => void;
    isRoot?: boolean;
    editing?: boolean;
    onEditDone?: (id: string) => void;
  };
};

function MindNodeImpl({ id, data, selected }: Props) {
  const { hue, depth, label, isRoot } = data;
  const color = hueToColor(hue, depth);
  const [editing, setEditing] = useState(!!data.editing);
  const [val, setVal] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const rf = useReactFlow();

  useEffect(() => setVal(label), [label]);
  useEffect(() => {
    if (data.editing) setEditing(true);
  }, [data.editing]);
  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    data.onRename?.(id, val.trim() || "Ý tưởng");
    data.onEditDone?.(id);
  };

  return (
    <div
      className={cn(
        "group relative rounded-2xl border backdrop-blur-xl transition-all",
        "shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]",
        selected ? "ring-2 ring-offset-2 ring-offset-background" : "",
      )}
      style={{
        background: `color-mix(in oklab, ${color} 18%, var(--background))`,
        borderColor: `color-mix(in oklab, ${color} 50%, transparent)`,
        ["--tw-ring-color" as string]: color,
        minWidth: isRoot ? 180 : 140,
        padding: isRoot ? "14px 22px" : "10px 16px",
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: color, border: "none", width: 8, height: 8 }}
        />
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, border: "none", width: 8, height: 8 }}
      />

      {editing ? (
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setVal(label);
              setEditing(false);
              data.onEditDone?.(id);
            }
          }}
          className="w-full bg-transparent text-sm font-medium outline-none"
          style={{ color: "var(--foreground)" }}
        />
      ) : (
        <div
          className={cn(
            "select-none text-sm font-semibold",
            isRoot && "text-base",
          )}
          style={{ color: "var(--foreground)" }}
        >
          {label}
        </div>
      )}

      {/* Floating action bar */}
      <div
        className="pointer-events-none absolute -right-2 -top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild?.(id);
            // focus the newly created node after next frame
            requestAnimationFrame(() => rf.fitView({ duration: 200, padding: 0.3 }));
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-foreground shadow-md ring-1 ring-border hover:bg-accent"
          title="Thêm nhánh con (Tab)"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {!isRoot && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-destructive shadow-md ring-1 ring-border hover:bg-destructive hover:text-destructive-foreground"
            title="Xóa (Delete)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export const MindNode = memo(MindNodeImpl);
