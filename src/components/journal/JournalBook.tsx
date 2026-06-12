import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import type { JournalEntry } from "@/types/journal";
import { BookOpen, Sparkles } from "lucide-react";

type Props = {
  entries: JournalEntry[];
  onOpenEntry: (id: string) => void;
  onNewEntry: () => void;
};

const Page = forwardRef<HTMLDivElement, { children: React.ReactNode; cover?: boolean }>(
  ({ children, cover }, ref) => (
    <div
      ref={ref}
      className={
        cover
          ? "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#3a2419] via-[#5c3a26] to-[#3a2419] text-amber-50 shadow-2xl"
          : "h-full w-full overflow-hidden bg-[#fdf6e8] p-6 text-[#3a2419] shadow-inner dark:bg-[#2a2018] dark:text-amber-50/90"
      }
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
  ),
);
Page.displayName = "JournalPage";

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
  const bookRef = useRef<any>(null);
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

  const flip = (dir: "next" | "prev") => {
    if (!bookRef.current) return;
    const api = bookRef.current.pageFlip?.();
    if (!api) return;
    dir === "next" ? api.flipNext() : api.flipPrev();
  };

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <button
          onClick={() => flip("prev")}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm shadow-soft transition hover:bg-accent"
        >
          ← Trang trước
        </button>
        <button
          onClick={onNewEntry}
          className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-90"
        >
          + Viết hôm nay
        </button>
        <button
          onClick={() => flip("next")}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm shadow-soft transition hover:bg-accent"
        >
          Trang sau →
        </button>
      </div>

      <HTMLFlipBook
        ref={bookRef}
        width={size.w}
        height={size.h}
        size="fixed"
        minWidth={280}
        maxWidth={600}
        minHeight={380}
        maxHeight={800}
        showCover
        flippingTime={700}
        maxShadowOpacity={0.5}
        drawShadow
        mobileScrollSupport
        className="journal-book"
        style={{}}
        startPage={0}
        usePortrait
        startZIndex={0}
        autoSize={false}
        clickEventForward
        useMouseEvents
        swipeDistance={30}
        showPageCorners
        disableFlipByClick={false}
      >
        {/* Front cover */}
        <Page cover>
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
        </Page>

        {/* Table of contents */}
        <Page>
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
                                {new Date(e.date).getDate()}.{" "}
                                {e.title || "(không tiêu đề)"}
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))
              )}
            </div>
          </div>
        </Page>

        {/* Entry pages */}
        {sorted.map((e) => (
          <Page key={e.id}>
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
          </Page>
        ))}

        {/* Back cover (ensure even page count by adding blank if needed) */}
        {sorted.length % 2 === 0 && (
          <Page>
            <div className="flex h-full items-center justify-center text-xs italic opacity-40">
              ~ Trang trống ~
            </div>
          </Page>
        )}
        <Page cover>
          <div className="flex flex-col items-center gap-3 text-center">
            <Sparkles className="h-6 w-6 text-amber-200/60" />
            <p className="font-serif text-sm italic text-amber-100/70">
              "Mỗi trang là một mảnh ký ức."
            </p>
          </div>
        </Page>
      </HTMLFlipBook>
    </div>
  );
}
