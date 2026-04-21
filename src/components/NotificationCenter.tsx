import { useState } from "react";
import { Bell, Check, Trash2, X, CalendarRange, Wallet, Target, Timer, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useNotificationCenter,
  type AppNotification,
  type NotificationCategory,
} from "@/hooks/useNotificationCenter";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; icon: typeof Bell; tone: string }
> = {
  calendar: { label: "Lịch", icon: CalendarRange, tone: "text-cyan-600" },
  finance: { label: "Tài chính", icon: Wallet, tone: "text-pink-600" },
  goal: { label: "Mục tiêu", icon: Target, tone: "text-emerald-600" },
  focus: { label: "Focus", icon: Timer, tone: "text-violet-600" },
  system: { label: "Hệ thống", icon: Info, tone: "text-muted-foreground" },
};

type Filter = "all" | NotificationCategory | "unread";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function NotifRow({
  n,
  onRead,
  onRemove,
}: {
  n: AppNotification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const meta = CATEGORY_META[n.category];
  const Icon = meta.icon;
  const tone =
    n.kind === "danger"
      ? "border-l-destructive"
      : n.kind === "warn"
      ? "border-l-orange-500"
      : n.kind === "success"
      ? "border-l-emerald-500"
      : "border-l-primary";
  return (
    <div
      className={cn(
        "group relative flex gap-3 border-l-2 px-3 py-2.5 transition-colors hover:bg-accent/40",
        tone,
        !n.read && "bg-accent/20",
      )}
    >
      <div className={cn("mt-0.5 shrink-0", meta.tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium">{n.title}</p>
          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">
          {n.body}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {meta.label} · {timeAgo(n.createdAt)}
        </p>
      </div>
      <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!n.read && (
          <button
            onClick={() => onRead(n.id)}
            className="rounded p-1 hover:bg-accent"
            aria-label="Đánh dấu đã đọc"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onRemove(n.id)}
          className="rounded p-1 hover:bg-accent"
          aria-label="Xoá"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const { items, unread, markAllRead, markRead, remove, clearAll } = useNotificationCenter();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = items.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.category === filter;
  });

  const counts: Record<NotificationCategory, number> = {
    calendar: 0,
    finance: 0,
    goal: 0,
    focus: 0,
    system: 0,
  };
  items.forEach((n) => {
    counts[n.category]++;
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-full p-2 text-muted-foreground hover:bg-accent/10"
          aria-label="Thông báo"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0 max-h-[80vh] flex flex-col"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div>
            <h3 className="text-sm font-semibold">Thông báo</h3>
            <p className="text-[11px] text-muted-foreground">
              {items.length} mục · {unread} chưa đọc
            </p>
          </div>
          <div className="flex gap-1">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              >
                Đọc hết
              </button>
            )}
            {items.length > 0 && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              >
                <Trash2 className="h-3 w-3" /> Xoá
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border px-2 py-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Tất cả ({items.length})
          </FilterChip>
          <FilterChip active={filter === "unread"} onClick={() => setFilter("unread")}>
            Chưa đọc ({unread})
          </FilterChip>
          {(Object.keys(CATEGORY_META) as NotificationCategory[]).map((cat) => {
            if (counts[cat] === 0) return null;
            return (
              <FilterChip key={cat} active={filter === cat} onClick={() => setFilter(cat)}>
                {CATEGORY_META[cat].label} ({counts[cat]})
              </FilterChip>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 opacity-30" />
              <p>Chưa có thông báo</p>
              <p className="px-6 text-xs">
                Cảnh báo ngân sách, nhắc lịch, hoàn thành mục tiêu… sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((n) => (
                <NotifRow key={n.id} n={n} onRead={markRead} onRemove={remove} />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-gradient-brand text-white shadow-soft"
          : "bg-accent/40 text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
