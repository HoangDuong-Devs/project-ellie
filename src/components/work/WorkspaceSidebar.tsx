import { useState } from "react";
import { Plus, Settings as SettingsIcon, ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { LABEL_COLORS, type Workspace } from "@/types/work";
import { WorkspaceForm } from "./WorkspaceForm";

interface Props {
  workspaces: Workspace[];
  activeId: string | null;
  view: "board" | "backlog" | "settings";
  onSelectWorkspace: (id: string) => void;
  onSelectView: (view: "board" | "backlog" | "settings") => void;
  onCreate: (data: {
    name: string;
    icon?: string;
    color?: import("@/types/work").LabelColor;
    useSprints?: boolean;
    description?: string;
  }) => void;
}

export function WorkspaceSidebar({
  workspaces,
  activeId,
  view,
  onSelectWorkspace,
  onSelectView,
  onCreate,
}: Props) {
  const [open, setOpen] = useState(false);
  const active = workspaces.find((w) => w.id === activeId);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> Workspace
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Tạo workspace"
          title="Tạo workspace"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {workspaces.map((w) => {
          const isActive = w.id === activeId;
          return (
            <div key={w.id}>
              <button
                onClick={() => onSelectWorkspace(w.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                  isActive
                    ? "bg-gradient-brand-soft font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="text-base leading-none">{w.icon ?? "📁"}</span>
                <span className="flex-1 truncate">{w.name}</span>
                <span
                  className={cn("h-2 w-2 rounded-full", LABEL_COLORS[w.color].dot)}
                  aria-hidden
                />
              </button>

              {isActive && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                  <SubItem
                    label="Bảng"
                    active={view === "board"}
                    onClick={() => onSelectView("board")}
                  />
                  {w.useSprints && (
                    <SubItem
                      label="Backlog & Sprint"
                      active={view === "backlog"}
                      onClick={() => onSelectView("backlog")}
                    />
                  )}
                  <SubItem
                    label="Cài đặt"
                    icon={<SettingsIcon className="h-3.5 w-3.5" />}
                    active={view === "settings"}
                    onClick={() => onSelectView("settings")}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {active && (
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          <p className="line-clamp-2">{active.description || "Không có mô tả"}</p>
        </div>
      )}

      <WorkspaceForm
        open={open}
        onOpenChange={setOpen}
        onSubmit={(data) => {
          onCreate(data);
          setOpen(false);
        }}
      />
    </aside>
  );
}

function SubItem({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon ?? <ChevronRight className="h-3 w-3 opacity-60" />}
      {label}
    </button>
  );
}
