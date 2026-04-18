import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { uid } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/calendar";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({ meta: [{ title: "Lịch vạn niên — ProjectEllie" }] }),
  component: CalendarPage,
});

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarPage() {
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>("ellie:events", []);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(ymd(now));

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date | null; key: string | null }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null, key: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      cells.push({ date: dt, key: ymd(dt) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: null });
    return cells;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return map;
  }, [events]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const todayKey = ymd(new Date());
  const selectedEvents = selected ? eventsByDay.get(selected) || [] : [];

  return (
    <div>
      <PageHeader title="Lịch vạn niên" description="Đánh dấu các ngày quan trọng và ghi chú sự kiện." />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={prevMonth} className="rounded-full border border-border p-2 hover:bg-accent/10">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-bold">{MONTHS[month]} {year}</h3>
            <button onClick={nextMonth} className="rounded-full border border-border p-2 hover:bg-accent/10">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-border pb-2 text-center text-xs font-semibold text-muted-foreground">
            {DAYS.map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {grid.map((cell, i) => {
              if (!cell.date) return <div key={i} className="aspect-square" />;
              const isToday = cell.key === todayKey;
              const isSel = cell.key === selected;
              const evs = eventsByDay.get(cell.key!) || [];
              return (
                <button
                  key={i}
                  onClick={() => setSelected(cell.key)}
                  className={cn(
                    "aspect-square rounded-xl border p-1.5 text-left transition-all",
                    isSel
                      ? "border-primary bg-gradient-brand text-white shadow-soft"
                      : isToday
                        ? "border-primary bg-pink-500/5"
                        : "border-transparent hover:bg-muted/50",
                  )}
                >
                  <div className={cn("text-sm font-semibold", isSel && "text-white")}>
                    {cell.date.getDate()}
                  </div>
                  {evs.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {evs.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            isSel ? "bg-white" : "bg-gradient-brand",
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <DayPanel
          dateKey={selected}
          events={selectedEvents}
          onAdd={(title, note) => {
            if (!selected) return;
            setEvents([{ id: uid(), date: selected, title, note }, ...events]);
          }}
          onRemove={(id) => setEvents(events.filter((e) => e.id !== id))}
        />
      </div>
    </div>
  );
}

function DayPanel({
  dateKey,
  events,
  onAdd,
  onRemove,
}: {
  dateKey: string | null;
  events: CalendarEvent[];
  onAdd: (title: string, note?: string) => void;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  if (!dateKey) {
    return (
      <aside className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm text-muted-foreground">Chọn một ngày để xem sự kiện.</p>
      </aside>
    );
  }

  const date = new Date(dateKey);
  return (
    <aside className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Ngày đã chọn</div>
        <div className="text-lg font-bold text-gradient-brand">
          {date.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="space-y-2">
        <input
          placeholder="Tên sự kiện (vd: Sinh nhật mẹ)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Ghi chú (tuỳ chọn)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            if (!title.trim()) return;
            onAdd(title.trim(), note.trim() || undefined);
            setTitle("");
            setNote("");
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" /> Thêm sự kiện
        </button>
      </div>

      <div className="mt-5">
        <h4 className="mb-2 text-sm font-semibold">Sự kiện ({events.length})</h4>
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Không có sự kiện</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gradient-brand" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{e.title}</div>
                  {e.note && <div className="mt-0.5 text-xs text-muted-foreground">{e.note}</div>}
                </div>
                <button
                  onClick={() => onRemove(e.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
