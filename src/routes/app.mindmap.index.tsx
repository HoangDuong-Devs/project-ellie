import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Network,
  MoreVertical,
  Trash2,
  Copy,
  Pencil,
  Tag as TagIcon,
  X,
} from "lucide-react";
import { useMindMaps } from "@/components/mindmap/mindmapStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hueToColor } from "@/components/mindmap/layout";
import type { MindMapDoc } from "@/types/mindmap";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/mindmap/")({
  component: GalleryPage,
});

function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d} ngày trước`;
  return new Date(ts).toLocaleDateString("vi-VN");
}

function GalleryPage() {
  const navigate = useNavigate();
  const { docs, create, remove, duplicate, update } = useMindMaps();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<MindMapDoc | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => d.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [docs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs
      .filter((d) => (activeTag ? d.tags.includes(activeTag) : true))
      .filter((d) =>
        q ? d.name.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q)) : true,
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [docs, query, activeTag]);

  const handleCreate = () => {
    const d = create();
    navigate({ to: "/app/mindmap/$id", params: { id: d.id } });
  };

  return (
    <div>
      <PageHeader
        title="Mind Map"
        description="Thư viện sơ đồ tư duy của bạn — tạo nhiều bản, gắn tag để gom nhóm."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc tag..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Tạo mới
        </Button>
      </div>

      {allTags.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !activeTag
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent/10",
            )}
          >
            Tất cả
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(t === activeTag ? null : t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeTag === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent/10",
              )}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-soft">
            <Network className="h-8 w-8" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">
            {docs.length === 0 ? "Chưa có sơ đồ nào" : "Không tìm thấy sơ đồ phù hợp"}
          </h3>
          <p className="mb-5 max-w-sm text-sm text-muted-foreground">
            {docs.length === 0
              ? "Bắt đầu phác ý tưởng đầu tiên của bạn — kéo thả, nối nhánh, gắn tag để dễ tìm lại."
              : "Thử bỏ bộ lọc hoặc đổi từ khoá tìm kiếm."}
          </p>
          {docs.length === 0 && (
            <Button onClick={handleCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Tạo sơ đồ đầu tiên
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <MindMapCard
              key={d.id}
              doc={d}
              onDelete={() => {
                if (confirm(`Xóa "${d.name}"?`)) remove(d.id);
              }}
              onDuplicate={() => duplicate(d.id)}
              onRename={() => setEditing(d)}
            />
          ))}
        </div>
      )}

      <EditDialog
        doc={editing}
        onClose={() => setEditing(null)}
        onSave={(id, patch) => {
          update(id, patch);
          setEditing(null);
        }}
      />
    </div>
  );
}

function MindMapCard({
  doc,
  onDelete,
  onDuplicate,
  onRename,
}: {
  doc: MindMapDoc;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        to="/app/mindmap/$id"
        params={{ id: doc.id }}
        className="block"
      >
        <ThumbPreview doc={doc} />
        <div className="p-4">
          <h3 className="line-clamp-1 font-semibold">{doc.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{doc.nodes.length} nút</span>
            <span>·</span>
            <span>{timeAgo(doc.updatedAt)}</span>
          </div>
          {doc.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {doc.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
                >
                  #{t}
                </span>
              ))}
              {doc.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{doc.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-soft">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 h-4 w-4" /> Đổi tên & tag
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" /> Nhân bản
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Lightweight SVG preview of the mind map structure. */
function ThumbPreview({ doc }: { doc: MindMapDoc }) {
  // Compute bounds
  const w = 320;
  const h = 160;
  if (doc.nodes.length === 0) {
    return <div className="h-40 bg-gradient-to-br from-accent/10 to-primary/10" />;
  }
  const xs = doc.nodes.map((n) => n.position.x);
  const ys = doc.nodes.map((n) => n.position.y);
  const minX = Math.min(...xs) - 40;
  const maxX = Math.max(...xs) + 200;
  const minY = Math.min(...ys) - 40;
  const maxY = Math.max(...ys) + 80;
  const bw = Math.max(maxX - minX, 1);
  const bh = Math.max(maxY - minY, 1);
  const scale = Math.min(w / bw, h / bh);
  const ox = (w - bw * scale) / 2 - minX * scale;
  const oy = (h - bh * scale) / 2 - minY * scale;

  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));

  return (
    <div className="h-40 bg-gradient-to-br from-accent/10 via-background to-primary/10">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full">
        {doc.edges.map((e) => {
          const s = nodeMap.get(e.source);
          const t = nodeMap.get(e.target);
          if (!s || !t) return null;
          const x1 = s.position.x * scale + ox + 30;
          const y1 = s.position.y * scale + oy;
          const x2 = t.position.x * scale + ox + 30;
          const y2 = t.position.y * scale + oy;
          const color = hueToColor(t.data.hue, t.data.depth ?? 1);
          return (
            <path
              key={e.id}
              d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
              stroke={color}
              strokeWidth={1.2}
              fill="none"
              opacity={0.7}
            />
          );
        })}
        {doc.nodes.map((n) => {
          const cx = n.position.x * scale + ox + 30;
          const cy = n.position.y * scale + oy;
          const isRoot = n.id === "root";
          const color = hueToColor(n.data.hue, n.data.depth ?? 0);
          return (
            <circle
              key={n.id}
              cx={cx}
              cy={cy}
              r={isRoot ? 6 : 3.5}
              fill={isRoot ? "hsl(var(--primary))" : color}
              opacity={0.9}
            />
          );
        })}
      </svg>
    </div>
  );
}

function EditDialog({
  doc,
  onClose,
  onSave,
}: {
  doc: MindMapDoc | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<MindMapDoc>) => void;
}) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Reset when doc changes
  useEffect(() => {
    if (doc) {
      setName(doc.name);
      setTags(doc.tags);
      setTagInput("");
    }
  }, [doc]);

  if (!doc) return null;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  };

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi tên & tag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tên</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tag</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium"
                >
                  #{t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <TagIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Thêm tag, nhấn Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="pl-8"
                />
              </div>
              <Button type="button" variant="outline" onClick={addTag}>Thêm</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => onSave(doc.id, { name: name.trim() || "Không tên", tags })}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
