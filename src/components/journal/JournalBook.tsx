import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { JournalEntry } from "@/types/journal";
import { BookOpen, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  entries: JournalEntry[];
  onOpenEntry: (id: string) => void;
  onNewEntry: () => void;
};

type BookPage = {
  key: string;
  cover?: boolean;
  content: ReactNode;
};

function PageSurface({ children, cover, side }: { children: ReactNode; cover?: boolean; side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "h-full w-full overflow-hidden shadow-inner",
        cover
          ? "flex flex-col items-center justify-center bg-gradient-to-br from-[#3a2419] via-[#5c3a26] to-[#3a2419] text-amber-50 shadow-2xl"
          : "bg-[#fdf6e8] p-6 text-[#3a2419] dark:bg-[#2a2018] dark:text-amber-50/90",
        side === "left" ? "rounded-l-xl" : "rounded-r-xl",
      )}
      style={
        cover
          ? undefined
          : {
              backgroundImage:
                "repeating-linear-gradient(180deg, transparent 0 31px, color-mix(in oklab, currentColor 8%, transparent) 31px 32px)",
            }
      }
    >
      {children}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `Tháng ${Number(m)}/${y}`;
}

export function JournalBook({ entries, onOpenEntry, onNewEntry }: Props) {
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [size, setSize] = useState({ w: 480, h: 640 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const calc = () => {
      const el = containerRef.current;
      if (!el) return;
      const maxW = Math.min(el.clientWidth, 1000);
      const maxH = Math.min(window.innerHeight - 200, 760);
      // book is 2 pages wide; ratio per page ~ 3/4
      let w = Math.floor(maxW / 2);
      let h = Math.floor(w * 1.35);
      if (h > maxH) {
        h = maxH;
        w = Math.floor(h / 1.35);
      }
      setSize({ w, h });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [entries],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    sorted.forEach((e) => {
      const k = monthKey(e.date);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    });
    return m;
  }, [sorted]);

  const pages = useMemo<BookPage[]>(() => {
    const entryPages: BookPage[] = sorted.map((e) => ({
      key: e.id,
      content: (
        <div className="flex h-full flex-col">
          <div className="mb-3 border-b border-current/20 pb-2">
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-60">
              {formatDate(e.date)}
            </div>
            <h3 className="mt-1 font-serif text-2xl font-bold leading-tight">
              {e.title || "(không tiêu đề)"}
            </h3>
          </div>
          <div
            className="prose prose-sm max-w-none flex-1 overflow-hidden font-serif leading-relaxed [&_*]:!text-current"
            dangerouslySetInnerHTML={{
              __html: e.content || "<p class='italic opacity-50'>Trang trống...</p>",
            }}
          />
          <button
            onClick={() => onOpenEntry(e.id)}
            className="mt-3 self-end text-[11px] uppercase tracking-widest opacity-60 hover:opacity-100"
          >
            Chỉnh sửa →
          </button>
        </div>
      ),
    }));

    return [
      {
        key: "front-cover",
        cover: true,
        content: (
          <div className="flex flex-col items-center gap-6 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100/10 ring-2 ring-amber-200/30">
              <BookOpen className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-amber-200/70">
                My Journal
              </div>
              <h2 className="mt-3 font-serif text-3xl font-bold leading-tight">Nhật ký</h2>
              <p className="mt-2 text-sm italic text-amber-100/70">
                Ghi lại những khoảnh khắc của riêng bạn
              </p>
            </div>
            <div className="mt-8 text-[11px] uppercase tracking-widest text-amber-200/50">
              {new Date().getFullYear()}
            </div>
          </div>
        ),
      },
      {
        key: "toc",
        content: (
          <div className="flex h-full flex-col">
            <div className="mb-4 border-b border-current/20 pb-2">
              <div className="text-[10px] uppercase tracking-[0.3em] opacity-60">Mục lục</div>
              <h3 className="font-serif text-2xl font-bold">Các tháng</h3>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
              {grouped.size === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center opacity-60">
                  <Sparkles className="h-6 w-6" />
                  <p className="text-sm italic">Chưa có entry nào</p>
                  <p className="text-xs">Nhấn "Viết hôm nay" để bắt đầu</p>
                </div>
              ) : (
                Array.from(grouped.entries())
                  .reverse()
                  .map(([k, list]) => (
                    <div key={k}>
                      <div className="font-serif text-sm font-semibold">{monthLabel(k)}</div>
                      <ul className="mt-1 space-y-1 pl-3 text-xs">
                        {list
                          .slice()
                          .reverse()
                          .map((e) => (
                            <li key={e.id}>
                              <button
                                onClick={() => onOpenEntry(e.id)}
                                className="text-left italic underline-offset-4 hover:underline"
                              >
                                {new Date(e.date).getDate()}. {e.title || "(không tiêu đề)"}
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))
              )}
            </div>
          </div>
        ),
      },
      ...entryPages,
      ...(sorted.length % 2 === 0
        ? [
            {
              key: "blank",
              content: (
                <div className="flex h-full items-center justify-center text-xs italic opacity-40">
                  ~ Trang trống ~
                </div>
              ),
            },
          ]
        : []),
      {
        key: "back-cover",
        cover: true,
        content: (
          <div className="flex flex-col items-center gap-3 text-center">
            <Sparkles className="h-6 w-6 text-amber-200/60" />
            <p className="font-serif text-sm italic text-amber-100/70">
              "Mỗi trang là một mảnh ký ức."
            </p>
          </div>
        ),
      },
    ];
  }, [grouped, onOpenEntry, sorted]);

  const maxSpread = Math.max(0, Math.ceil(pages.length / 2) - 1);
  const leftPage = pages[spreadIndex * 2];
  const rightPage = pages[spreadIndex * 2 + 1];

  useEffect(() => {
    setSpreadIndex((current) => Math.min(current, maxSpread));
  }, [maxSpread]);

  const flip = (dir: "next" | "prev") => {
    setSpreadIndex((current) => {
      if (dir === "next") return Math.min(maxSpread, current + 1);
      return Math.max(0, current - 1);
    });
  };

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <button
          onClick={() => flip("prev")}
          disabled={spreadIndex === 0}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-soft transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Trang trước
        </button>
        <button
          onClick={onNewEntry}
          className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-90"
        >
          + Viết hôm nay
        </button>
        <button
          onClick={() => flip("next")}
          disabled={spreadIndex === maxSpread}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-soft transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Trang sau <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        className="relative grid origin-center grid-cols-2 rounded-xl shadow-2xl [perspective:1800px]"
        style={{ width: size.w * 2, maxWidth: "100%", height: size.h }}
      >
        <div className="absolute inset-y-5 left-1/2 z-20 w-px bg-black/20 shadow-[0_0_24px_rgba(0,0,0,0.35)]" />
        <div
          key={leftPage?.key}
          className="animate-[journal-page-in_420ms_ease-out]"
          style={{ transformOrigin: "right center" }}
        >
          <PageSurface cover={leftPage?.cover} side="left">
            {leftPage?.content}
          </PageSurface>
        </div>
        <div
          key={rightPage?.key}
          className="animate-[journal-page-in_420ms_ease-out]"
          style={{ transformOrigin: "left center" }}
        >
          <PageSurface cover={rightPage?.cover} side="right">
            {rightPage?.content}
          </PageSurface>
        </div>
      </div>
    </div>
  );
}
