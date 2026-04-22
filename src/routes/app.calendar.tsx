import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Bell,
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  createCalendar,
  createTodo,
  deleteCalendar as deleteCalendarApi,
  deleteEvent as deleteEventApi,
  deleteTodo as deleteTodoApi,
  listCalendars,
  listEvents,
  listTodos,
  patchCalendar,
  patchTodo,
  upsertEvent,
} from "@/services/calendar-api-client";
import { requestNotificationPermission } from "@/hooks/useNotifications";
import { uid } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CALENDARS,
  removeCalendarItem,
  upsertCalendarItem,
} from "@/services/calendar-service";
import { solarToLunar, getHolidaysForDate, formatLunarShort, formatLunarFull } from "@/lib/lunar";
import {
  COLORS,
  COLOR_KEYS,
  RECURRENCE_LABELS,
  REMINDER_PRESETS,
  WEEKDAY_SHORT,
  addDays,
  addMonths,
  describeRecurrence,
  expandOccurrences,
  fmtRange,
  fmtTime,
  migrateLegacyEvents,
  parseLocal,
  pad,
  sameDay,
  startOfDay,
  startOfWeek,
  ymd,
  ymdhm,
} from "@/lib/calendar";
import type {
  Calendar as CalendarType,
  CalendarColor,
  CalendarItem,
  RecurrenceFreq,
  RecurrenceRule,
  WeekDay,
} from "@/types/calendar";
import type { Todo } from "@/types/schedule";
import { useDataAutoRefresh } from "@/services/api-live-sync";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({ meta: [{ title: "Lịch — ProjectEllie" }] }),
  component: CalendarPage,
});

type ViewMode = "month" | "week" | "day";

const WEEK_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_PX = 48; // height per hour in week/day grid

function CalendarPage() {
  const [calendars, setCalendars] = useState<CalendarType[]>(DEFAULT_CALENDARS);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [calRes, itemsRes, todosRes] = await Promise.all([
      listCalendars(),
      listEvents(),
      listTodos(),
    ]);
    setCalendars(calRes.calendars);
    setItems(itemsRes.items);
    setTodos(todosRes.todos);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [calRes, itemsRes, todosRes] = await Promise.all([
          listCalendars(),
          listEvents(),
          listTodos(),
        ]);
        if (!active) return;
        setCalendars(calRes.calendars);
        setItems(itemsRes.items);
        setTodos(todosRes.todos);
      } catch {
        // keep defaults
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useDataAutoRefresh(refresh, "calendar");

  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [editing, setEditing] = useState<{ item?: CalendarItem; defaults?: Partial<CalendarItem> } | null>(
    null,
  );

  const visibleCalIds = useMemo(
    () => new Set(calendars.filter((c) => c.visible).map((c) => c.id)),
    [calendars],
  );

  // Range to expand occurrences
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (view === "day") {
      const s = startOfDay(cursor);
      return [s, addDays(s, 1)];
    }
    if (view === "week") {
      const s = startOfWeek(cursor);
      return [s, addDays(s, 7)];
    }
    // month: include leading/trailing weeks
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const s = startOfWeek(first);
    return [s, addDays(s, 42)];
  }, [view, cursor]);

  const occurrences = useMemo(() => {
    const visible = items.filter((i) => visibleCalIds.has(i.calendarId));
    return expandOccurrences(visible, rangeStart, rangeEnd);
  }, [items, visibleCalIds, rangeStart, rangeEnd]);

  // Notification permission prompt on first add
  const [notifAsked, setNotifAsked] = useState(false);

  function upsertItem(it: CalendarItem) {
    setItems((prev) => upsertCalendarItem(prev, it));
    void upsertEvent(it)
      .then((res) => setItems(res.items))
      .catch(() => {
        /* ignore */
      });
    const hasReminder =
      it.reminderMinutes != null || (it.reminders && it.reminders.length > 0);
    if (hasReminder && !notifAsked) {
      setNotifAsked(true);
      requestNotificationPermission();
    }
  }
  function removeItem(id: string) {
    setItems((prev) => removeCalendarItem(prev, id));
    void deleteEventApi(id)
      .then((res) => setItems(res.items))
      .catch(() => {
        /* ignore */
      });
  }

  // Drag end: shift item by day delta (and hour delta in week/day view)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id).split("@")[0];
    const original = items.find((i) => i.id === id);
    if (!original) return;
    const dropData = over.data.current as { date?: string; hour?: number } | undefined;
    if (!dropData?.date) return;

    const start = parseLocal(original.startISO);
    const end = parseLocal(original.endISO);
    const dur = end.getTime() - start.getTime();

    const [y, mo, d] = dropData.date.split("-").map(Number);
    const newStart = new Date(start);
    newStart.setFullYear(y, mo - 1, d);
    if (dropData.hour != null && !original.allDay) {
      newStart.setHours(dropData.hour, 0, 0, 0);
    }
    const newEnd = new Date(newStart.getTime() + dur);
    upsertItem({ ...original, startISO: ymdhm(newStart), endISO: ymdhm(newEnd) });
  }

  // Header label
  const headerLabel = useMemo(() => {
    if (view === "day") {
      return cursor.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      return `${s.getDate()}/${s.getMonth() + 1} – ${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}`;
    }
    return `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`;
  }, [view, cursor]);

  function shift(delta: number) {
    if (view === "day") setCursor(addDays(cursor, delta));
    else if (view === "week") setCursor(addDays(cursor, delta * 7));
    else setCursor(addMonths(cursor, delta));
  }

  return (
    <div>
      <PageHeader title="Lịch" description="Quản lý sự kiện theo ngày, tuần, tháng — phong cách Google Calendar." />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <button
              onClick={() => {
                const now = new Date();
                now.setMinutes(0, 0, 0);
                const end = new Date(now);
                end.setHours(end.getHours() + 1);
                setEditing({
                  defaults: {
                    startISO: ymdhm(now),
                    endISO: ymdhm(end),
                    allDay: false,
                    calendarId: calendars[0]?.id || "personal",
                    recurrence: "none",
                  },
                });
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-4 py-3 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" /> Tạo sự kiện
            </button>

            <MiniMonth cursor={cursor} onPick={(d) => setCursor(d)} />

            <CalendarsPanel
              calendars={calendars}
              onToggleVisible={(id) => {
                const current = calendars.find((c) => c.id === id);
                if (!current) return;
                setCalendars((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
                );
                void patchCalendar(id, { visible: !current.visible })
                  .then((res) => setCalendars(res.calendars))
                  .catch(() => {
                    /* ignore */
                  });
              }}
              onDelete={(id) => {
                setCalendars((prev) => prev.filter((c) => c.id !== id));
                void deleteCalendarApi(id)
                  .then((res) => setCalendars(res.calendars))
                  .catch(() => {
                    /* ignore */
                  });
              }}
              onCreate={(input) => {
                void createCalendar(input)
                  .then((res) => setCalendars(res.calendars))
                  .catch(() => {
                    /* ignore */
                  });
              }}
            />

            <TodosPanel
              todos={todos}
              onToggle={(id) => {
                const current = todos.find((t) => t.id === id);
                if (!current) return;
                setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
                void patchTodo(id, { done: !current.done })
                  .then((res) => setTodos(res.todos))
                  .catch(() => {
                    /* ignore */
                  });
              }}
              onAdd={(title) => {
                void createTodo({ title, priority: "medium", done: false })
                  .then((res) => setTodos(res.todos))
                  .catch(() => {
                    /* ignore */
                  });
              }}
              onRemove={(id) => {
                void deleteTodoApi(id)
                  .then((res) => setTodos(res.todos))
                  .catch(() => {
                    /* ignore */
                  });
              }}
            />
          </aside>

          {/* Main */}
          <section className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-5">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCursor(new Date())}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent/10"
                >
                  Hôm nay
                </button>
                <button onClick={() => shift(-1)} className="rounded-full border border-border p-1.5 hover:bg-accent/10">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => shift(1)} className="rounded-full border border-border p-1.5 hover:bg-accent/10">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <h3 className="ml-1 text-base font-bold sm:text-lg">{headerLabel}</h3>
              </div>
              <div className="inline-flex rounded-full border border-border bg-muted/40 p-1 text-xs font-semibold">
                {(["day", "week", "month"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded-full px-3 py-1.5 transition-all",
                      view === v ? "bg-gradient-brand text-white shadow-soft" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v === "day" ? "Ngày" : v === "week" ? "Tuần" : "Tháng"}
                  </button>
                ))}
              </div>
            </div>

            {view === "month" && (
              <MonthView
                cursor={cursor}
                rangeStart={rangeStart}
                occurrences={occurrences}
                calendars={calendars}
                onPickDay={(d) => {
                  setCursor(d);
                  setView("day");
                }}
                onCreate={(d) => {
                  const s = new Date(d);
                  s.setHours(9, 0, 0, 0);
                  const e = new Date(s);
                  e.setHours(10, 0, 0, 0);
                  setEditing({
                    defaults: {
                      startISO: ymdhm(s),
                      endISO: ymdhm(e),
                      allDay: false,
                      calendarId: calendars[0]?.id || "personal",
                      recurrence: "none",
                    },
                  });
                }}
                onOpen={(it) => setEditing({ item: it })}
              />
            )}

            {view === "week" && (
              <WeekView
                cursor={cursor}
                occurrences={occurrences}
                calendars={calendars}
                onCreate={(d, hour) => {
                  const s = new Date(d);
                  s.setHours(hour, 0, 0, 0);
                  const e = new Date(s);
                  e.setHours(hour + 1, 0, 0, 0);
                  setEditing({
                    defaults: {
                      startISO: ymdhm(s),
                      endISO: ymdhm(e),
                      allDay: false,
                      calendarId: calendars[0]?.id || "personal",
                      recurrence: "none",
                    },
                  });
                }}
                onOpen={(it) => setEditing({ item: it })}
                onResize={(id, newEndDate) => {
                  const o = items.find((i) => i.id === id);
                  if (!o) return;
                  upsertItem({ ...o, endISO: ymdhm(newEndDate) });
                }}
              />
            )}

            {view === "day" && (
              <DayView
                cursor={cursor}
                occurrences={occurrences}
                calendars={calendars}
                onCreate={(hour) => {
                  const s = new Date(cursor);
                  s.setHours(hour, 0, 0, 0);
                  const e = new Date(s);
                  e.setHours(hour + 1, 0, 0, 0);
                  setEditing({
                    defaults: {
                      startISO: ymdhm(s),
                      endISO: ymdhm(e),
                      allDay: false,
                      calendarId: calendars[0]?.id || "personal",
                      recurrence: "none",
                    },
                  });
                }}
                onOpen={(it) => setEditing({ item: it })}
              />
            )}
          </section>
        </div>
      </DndContext>

      {editing && (
        <EventModal
          calendars={calendars}
          item={editing.item}
          defaults={editing.defaults}
          onClose={() => setEditing(null)}
          onSave={(it) => {
            upsertItem(it);
            setEditing(null);
          }}
          onDelete={(id) => {
            removeItem(id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ----------------- Mini Month ----------------- */
function MiniMonth({ cursor, onPick }: { cursor: Date; onPick: (d: Date) => void }) {
  const [m, setM] = useState(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  useEffect(() => {
    setM(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  }, [cursor]);

  const start = startOfWeek(m);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = new Date();

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setM(addMonths(m, -1))} className="rounded-full p-1 hover:bg-accent/10">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold">
          Tháng {m.getMonth() + 1}, {m.getFullYear()}
        </span>
        <button onClick={() => setM(addMonths(m, 1))} className="rounded-full p-1 hover:bg-accent/10">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted-foreground">
        {WEEK_LABELS.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d) => {
          const out = d.getMonth() !== m.getMonth();
          const isToday = sameDay(d, today);
          const isSel = sameDay(d, cursor);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPick(d)}
              className={cn(
                "aspect-square rounded-lg text-[11px] font-medium transition-all",
                out && "text-muted-foreground/40",
                !isSel && !isToday && "hover:bg-accent/10",
                isToday && !isSel && "text-primary",
                isSel && "bg-gradient-brand text-white shadow-soft",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------- Calendars Panel ----------------- */
function CalendarsPanel({
  calendars,
  onToggleVisible,
  onDelete,
  onCreate,
}: {
  calendars: CalendarType[];
  onToggleVisible: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (input: { name: string; color: CalendarColor; visible?: boolean }) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<CalendarColor>("green");

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Lịch của tôi
        </h4>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent/10 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <ul className="space-y-1">
        {calendars.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <button
              onClick={() => onToggleVisible(c.id)}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
                c.visible ? `${COLORS[c.color].bg} border-transparent` : "border-muted-foreground/40",
              )}
              aria-label="Toggle visibility"
            >
              {c.visible && <Check className="h-3 w-3 text-white" />}
            </button>
            <span className={cn("flex-1 truncate text-sm", !c.visible && "text-muted-foreground line-through")}>
              {c.name}
            </span>
            {calendars.length > 1 && (
              <button
                onClick={() => onDelete(c.id)}
                className="rounded p-1 text-muted-foreground/60 opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                title="Xoá lịch"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-2">
          <input
            placeholder="Tên lịch mới"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
          />
          <div className="flex flex-wrap gap-1">
            {COLOR_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setColor(k)}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all",
                  COLORS[k].bg,
                  color === k ? "border-foreground scale-110" : "border-transparent",
                )}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (!name.trim()) return;
                onCreate({ name: name.trim(), color, visible: true });
                setName("");
                setAdding(false);
              }}
              className="flex-1 rounded-lg bg-gradient-brand px-2 py-1 text-xs font-semibold text-white"
            >
              Thêm
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-lg border border-border px-2 py-1 text-xs"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- Todos Panel (sidebar) ----------------- */
function TodosPanel({
  todos,
  onToggle,
  onAdd,
  onRemove,
}: {
  todos: Todo[];
  onToggle: (id: string) => void;
  onAdd: (title: string) => void;
  onRemove: (id: string) => void;
}) {
  const [t, setT] = useState("");
  const open = todos.filter((x) => !x.done).slice(0, 8);
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Việc cần làm
      </h4>
      <div className="mb-2 flex gap-1">
        <input
          placeholder="Thêm việc nhanh..."
          value={t}
          onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && t.trim()) {
              onAdd(t.trim());
              setT("");
            }
          }}
          className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
        />
      </div>
      {open.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">Hết việc 🎉</p>
      ) : (
        <ul className="space-y-1">
          {open.map((todo) => (
            <li key={todo.id} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/40">
              <button
                onClick={() => onToggle(todo.id)}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-muted-foreground/40 hover:border-primary"
              />
              <span className="flex-1 truncate text-xs">{todo.title}</span>
              <button
                onClick={() => onRemove(todo.id)}
                className="text-muted-foreground/60 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------- Month View ----------------- */
function MonthView({
  cursor,
  rangeStart,
  occurrences,
  calendars,
  onPickDay,
  onCreate,
  onOpen,
}: {
  cursor: Date;
  rangeStart: Date;
  occurrences: ReturnType<typeof expandOccurrences>;
  calendars: CalendarType[];
  onPickDay: (d: Date) => void;
  onCreate: (d: Date) => void;
  onOpen: (it: CalendarItem) => void;
}) {
  const today = new Date();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(rangeStart, i));
  const calMap = new Map(calendars.map((c) => [c.id, c]));

  const byDay = useMemo(() => {
    const m = new Map<string, typeof occurrences>();
    for (const o of occurrences) {
      const k = ymd(o.instanceStart);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(o);
    }
    return m;
  }, [occurrences]);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border pb-2 text-center text-xs font-semibold text-muted-foreground">
        {WEEK_LABELS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 pt-1">
        {cells.map((d) => {
          const key = ymd(d);
          const out = d.getMonth() !== cursor.getMonth();
          const isToday = sameDay(d, today);
          const list = byDay.get(key) || [];
          const lunar = solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear());
          const holidays = getHolidaysForDate(d);
          const hasPublic = holidays.some((h) => h.type === "public");
          const hasTrad = holidays.some((h) => h.type === "traditional");
          const isFirstLunar = lunar.day === 1;
          return (
            <DroppableDay key={key} dateKey={key}>
              <div
                className={cn(
                  "min-h-[92px] cursor-pointer rounded-xl border p-1.5 transition-all",
                  out ? "border-transparent bg-muted/20 text-muted-foreground/60" : "border-border bg-card hover:border-primary/40",
                  isToday && "border-primary bg-pink-500/5",
                  hasPublic && !out && "border-rose-300/60 bg-rose-50/40",
                )}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("[data-event]")) return;
                  onCreate(d);
                }}
                onDoubleClick={() => onPickDay(d)}
                title={[formatLunarFull(lunar), ...holidays.map((h) => h.name)].join("\n")}
              >
                <div className="mb-0.5 flex items-start justify-between gap-1">
                  <div className={cn("text-xs font-semibold leading-none", isToday && "text-gradient-brand", hasPublic && !out && !isToday && "text-rose-600")}>
                    {d.getDate()}
                  </div>
                  <div className={cn("text-[9px] font-medium leading-none", isFirstLunar ? "text-primary font-semibold" : "text-muted-foreground/70")}>
                    {formatLunarShort(lunar)}
                  </div>
                </div>
                {holidays.length > 0 && !out && (
                  <div
                    className={cn(
                      "mb-0.5 truncate text-[9px] font-medium leading-tight",
                      hasPublic ? "text-rose-600" : hasTrad ? "text-amber-600" : "text-muted-foreground",
                    )}
                    title={holidays.map((h) => h.name).join(", ")}
                  >
                    {holidays[0].name}
                  </div>
                )}
                <div className="space-y-0.5">
                  {list.slice(0, 2).map((o) => {
                    const cal = calMap.get(o.calendarId);
                    const color = (o.color || cal?.color || "pink") as CalendarColor;
                    return (
                      <DraggableEvent key={o.instanceKey} id={o.instanceKey}>
                        <button
                          data-event
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen(o);
                          }}
                          className={cn(
                            "block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium",
                            COLORS[color].soft,
                          )}
                          title={o.title}
                        >
                          {!o.allDay && <span className="opacity-70">{fmtTime(o.instanceStart)} </span>}
                          {o.title}
                        </button>
                      </DraggableEvent>
                    );
                  })}
                  {list.length > 2 && (
                    <div className="px-1 text-[10px] text-muted-foreground">+{list.length - 2} nữa</div>
                  )}
                </div>
              </div>
            </DroppableDay>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------- Week View ----------------- */
function WeekView({
  cursor,
  occurrences,
  calendars,
  onCreate,
  onOpen,
  onResize,
}: {
  cursor: Date;
  occurrences: ReturnType<typeof expandOccurrences>;
  calendars: CalendarType[];
  onCreate: (d: Date, hour: number) => void;
  onOpen: (it: CalendarItem) => void;
  onResize: (id: string, newEnd: Date) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();
  const calMap = new Map(calendars.map((c) => [c.id, c]));

  const allDay = occurrences.filter((o) => o.allDay);
  const timed = occurrences.filter((o) => !o.allDay);

  // Now-line position
  const [nowMin, setNowMin] = useState(today.getHours() * 60 + today.getMinutes());
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
        {/* Header row (sticky) */}
        <div className="sticky top-0 z-30 grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30 backdrop-blur">
          <div />
          {days.map((d, i) => {
            const isT = sameDay(d, today);
            const lunar = solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear());
            const holidays = getHolidaysForDate(d);
            const top = holidays[0];
            return (
              <div key={d.toISOString()} className="border-l border-border px-2 py-2 text-center" title={top ? top.name : undefined}>
                <div className="text-[10px] font-semibold text-muted-foreground">{WEEK_LABELS[i]}</div>
                <div className={cn("text-base font-bold", isT && "text-gradient-brand", top?.type === "public" && !isT && "text-rose-600")}>{d.getDate()}</div>
                <div className="text-[9px] text-muted-foreground/80">ÂL {formatLunarShort(lunar)}</div>
                {top && (
                  <div className={cn("mt-0.5 truncate text-[9px] font-medium", top.type === "public" ? "text-rose-600" : top.type === "traditional" ? "text-amber-600" : "text-muted-foreground")}>
                    {top.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All-day strip (sticky below header) */}
        {allDay.length > 0 && (
          <div className="sticky top-[52px] z-20 grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-card">
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">Cả ngày</div>
            {days.map((d) => {
              const dayItems = allDay.filter((o) => sameDay(o.instanceStart, d));
              return (
                <DroppableDay key={d.toISOString()} dateKey={ymd(d)}>
                  <div className="min-h-[28px] space-y-0.5 border-l border-border px-1 py-1">
                    {dayItems.map((o) => {
                      const cal = calMap.get(o.calendarId);
                      const color = (o.color || cal?.color || "pink") as CalendarColor;
                      return (
                        <DraggableEvent key={o.instanceKey} id={o.instanceKey}>
                          <button
                            onClick={() => onOpen(o)}
                            className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium", COLORS[color].soft)}
                          >
                            {o.title}
                          </button>
                        </DraggableEvent>
                      );
                    })}
                  </div>
                </DroppableDay>
              );
            })}
          </div>
        )}

        {/* Timed grid */}
        <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Hour labels */}
          <div className="bg-muted/20">
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="border-b border-border pr-2 text-right text-[10px] text-muted-foreground">
                {pad(h)}:00
              </div>
            ))}
          </div>
          {days.map((d) => {
            const isT = sameDay(d, today);
            const dayItems = timed.filter((o) => sameDay(o.instanceStart, d));
            return (
              <div key={d.toISOString()} className="relative border-l border-border">
                {/* Hour cells */}
                {HOURS.map((h) => (
                  <DroppableDay key={h} dateKey={ymd(d)} hour={h}>
                    <div
                      onClick={() => onCreate(d, h)}
                      style={{ height: HOUR_PX }}
                      className="cursor-pointer border-b border-border hover:bg-accent/5"
                    />
                  </DroppableDay>
                ))}
                {/* Now line */}
                {isT && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-gradient-brand"
                    style={{ top: (nowMin / 60) * HOUR_PX }}
                  >
                    <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-pink-500" />
                  </div>
                )}
                {/* Events */}
                {dayItems.map((o) => {
                  const cal = calMap.get(o.calendarId);
                  const color = (o.color || cal?.color || "pink") as CalendarColor;
                  const startMin = o.instanceStart.getHours() * 60 + o.instanceStart.getMinutes();
                  const endMin = o.instanceEnd.getHours() * 60 + o.instanceEnd.getMinutes();
                  const top = (startMin / 60) * HOUR_PX;
                  const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_PX);
                  return (
                    <ResizableTimedEvent
                      key={o.instanceKey}
                      id={o.instanceKey}
                      top={top}
                      height={height}
                      onResize={(deltaPx) => {
                        const deltaMin = Math.round((deltaPx / HOUR_PX) * 60 / 15) * 15;
                        const newEnd = new Date(o.instanceEnd.getTime() + deltaMin * 60_000);
                        if (newEnd <= o.instanceStart) return;
                        onResize(o.id, newEnd);
                      }}
                    >
                      <button
                        onClick={() => onOpen(o)}
                        className={cn(
                          "h-full w-full overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] shadow-sm",
                          COLORS[color].soft,
                        )}
                      >
                        <div className="font-semibold leading-tight">{o.title}</div>
                        <div className="text-[10px] opacity-75">{fmtRange(o.instanceStart, o.instanceEnd)}</div>
                      </button>
                    </ResizableTimedEvent>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Day View ----------------- */
function DayView({
  cursor,
  occurrences,
  calendars,
  onCreate,
  onOpen,
}: {
  cursor: Date;
  occurrences: ReturnType<typeof expandOccurrences>;
  calendars: CalendarType[];
  onCreate: (hour: number) => void;
  onOpen: (it: CalendarItem) => void;
}) {
  const today = new Date();
  const calMap = new Map(calendars.map((c) => [c.id, c]));
  const allDay = occurrences.filter((o) => o.allDay && sameDay(o.instanceStart, cursor));
  const timed = occurrences.filter((o) => !o.allDay && sameDay(o.instanceStart, cursor));
  const isT = sameDay(cursor, today);
  const [nowMin, setNowMin] = useState(today.getHours() * 60 + today.getMinutes());
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const lunar = solarToLunar(cursor.getDate(), cursor.getMonth() + 1, cursor.getFullYear());
  const holidays = getHolidaysForDate(cursor);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-3 py-2 text-xs">
        <span className="text-muted-foreground">{formatLunarFull(lunar)}</span>
        {holidays.map((h) => (
          <span
            key={h.name}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              h.type === "public" ? "bg-rose-100 text-rose-700" : h.type === "traditional" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground",
            )}
          >
            {h.name}
          </span>
        ))}
      </div>
      {allDay.length > 0 && (
        <div className="border-b border-border bg-card p-2">
          <div className="mb-1 text-[10px] font-semibold text-muted-foreground">Cả ngày</div>
          <div className="space-y-1">
            {allDay.map((o) => {
              const cal = calMap.get(o.calendarId);
              const color = (o.color || cal?.color || "pink") as CalendarColor;
              return (
                <button
                  key={o.instanceKey}
                  onClick={() => onOpen(o)}
                  className={cn("block w-full truncate rounded px-2 py-1 text-left text-sm font-medium", COLORS[color].soft)}
                >
                  {o.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="relative grid grid-cols-[60px_1fr] overflow-y-auto" style={{ maxHeight: "65vh" }}>
        <div className="bg-muted/20">
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_PX }} className="border-b border-border pr-2 text-right text-[10px] text-muted-foreground">
              {pad(h)}:00
            </div>
          ))}
        </div>
        <div className="relative">
          {HOURS.map((h) => (
            <div
              key={h}
              onClick={() => onCreate(h)}
              style={{ height: HOUR_PX }}
              className="cursor-pointer border-b border-border hover:bg-accent/5"
            />
          ))}
          {isT && (
            <div className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-gradient-brand" style={{ top: (nowMin / 60) * HOUR_PX }}>
              <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-pink-500" />
            </div>
          )}
          {timed.map((o) => {
            const cal = calMap.get(o.calendarId);
            const color = (o.color || cal?.color || "pink") as CalendarColor;
            const startMin = o.instanceStart.getHours() * 60 + o.instanceStart.getMinutes();
            const endMin = o.instanceEnd.getHours() * 60 + o.instanceEnd.getMinutes();
            const top = (startMin / 60) * HOUR_PX;
            const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_PX);
            return (
              <button
                key={o.instanceKey}
                onClick={() => onOpen(o)}
                style={{ top, height, left: 8, right: 8 }}
                className={cn("absolute overflow-hidden rounded-lg border px-2 py-1 text-left text-xs shadow-sm", COLORS[color].soft)}
              >
                <div className="font-semibold leading-tight">{o.title}</div>
                <div className="text-[10px] opacity-75">{fmtRange(o.instanceStart, o.instanceEnd)}</div>
                {o.description && <div className="mt-1 truncate text-[10px] opacity-75">{o.description}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Drag/Drop primitives ----------------- */
function DroppableDay({
  dateKey,
  hour,
  children,
}: {
  dateKey: string;
  hour?: number;
  children: React.ReactNode;
}) {
  const id = hour != null ? `${dateKey}#${hour}` : dateKey;
  const { setNodeRef, isOver } = useDroppable({ id, data: { date: dateKey, hour } });
  return (
    <div ref={setNodeRef} className={cn(isOver && "bg-pink-500/10")}>
      {children}
    </div>
  );
}

function DraggableEvent({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, opacity: isDragging ? 0.7 : 1 }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

function ResizableTimedEvent({
  id,
  top,
  height,
  onResize,
  children,
}: {
  id: string;
  top: number;
  height: number;
  onResize: (deltaPx: number) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const startY = useRef<number | null>(null);
  const lastDelta = useRef(0);

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    startY.current = e.clientY;
    lastDelta.current = 0;
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startY.current == null) return;
    lastDelta.current = e.clientY - startY.current;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (startY.current == null) return;
    const d = lastDelta.current;
    startY.current = null;
    if (Math.abs(d) > 4) onResize(d);
    (e.target as Element).releasePointerCapture(e.pointerId);
  }

  const style: React.CSSProperties = {
    position: "absolute",
    top,
    height,
    left: 4,
    right: 4,
    zIndex: isDragging ? 50 : 10,
    opacity: isDragging ? 0.7 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize rounded-b-lg bg-foreground/10 hover:bg-foreground/30"
      />
    </div>
  );
}

/* ----------------- Event Modal ----------------- */
function EventModal({
  item,
  defaults,
  calendars,
  onClose,
  onSave,
  onDelete,
}: {
  item?: CalendarItem;
  defaults?: Partial<CalendarItem>;
  calendars: CalendarType[];
  onClose: () => void;
  onSave: (it: CalendarItem) => void;
  onDelete: (id: string) => void;
}) {
  const initial: CalendarItem = item || {
    id: uid(),
    title: "",
    description: "",
    startISO: defaults?.startISO || ymdhm(new Date()),
    endISO: defaults?.endISO || ymdhm(new Date(Date.now() + 60 * 60 * 1000)),
    allDay: defaults?.allDay ?? false,
    calendarId: defaults?.calendarId || calendars[0]?.id || "personal",
    color: defaults?.color,
    recurrence: defaults?.recurrence || "none",
    recurrenceUntil: defaults?.recurrenceUntil,
    reminderMinutes: defaults?.reminderMinutes,
    createdAt: new Date().toISOString(),
  };

  const [form, setForm] = useState<CalendarItem>(initial);

  function update<K extends keyof CalendarItem>(k: K, v: CalendarItem[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Split startISO/endISO into date+time inputs for nicer UX
  const [sd, st] = form.startISO.split("T");
  const [ed, et] = form.endISO.split("T");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gradient-brand">
            {item ? "Sửa sự kiện" : "Sự kiện mới"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Tiêu đề sự kiện"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base font-medium"
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => update("allDay", e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Cả ngày
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Bắt đầu</label>
              <input
                type="date"
                value={sd}
                onChange={(e) => update("startISO", `${e.target.value}T${st}`)}
                className="w-full rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            {!form.allDay && (
              <div>
                <label className="text-xs text-muted-foreground">Giờ</label>
                <input
                  type="time"
                  value={st}
                  onChange={(e) => update("startISO", `${sd}T${e.target.value}`)}
                  className="w-full rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Kết thúc</label>
              <input
                type="date"
                value={ed}
                onChange={(e) => update("endISO", `${e.target.value}T${et}`)}
                className="w-full rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            {!form.allDay && (
              <div>
                <label className="text-xs text-muted-foreground">Giờ</label>
                <input
                  type="time"
                  value={et}
                  onChange={(e) => update("endISO", `${ed}T${e.target.value}`)}
                  className="w-full rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Lịch</label>
            <select
              value={form.calendarId}
              onChange={(e) => update("calendarId", e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Màu</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {COLOR_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => update("color", k)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all",
                    COLORS[k].bg,
                    form.color === k ? "border-foreground scale-110" : "border-transparent",
                  )}
                />
              ))}
              <button
                onClick={() => update("color", undefined)}
                className={cn(
                  "h-7 rounded-full border-2 px-2 text-[10px] font-semibold",
                  !form.color ? "border-foreground" : "border-border",
                )}
              >
                Mặc định
              </button>
            </div>
          </div>

          <RecurrenceEditor
            value={{
              recurrence: form.recurrence,
              recurrenceRule: form.recurrenceRule,
              recurrenceUntil: form.recurrenceUntil,
            }}
            onChange={(v) => {
              setForm((f) => ({
                ...f,
                recurrence: v.recurrence,
                recurrenceRule: v.recurrenceRule,
                recurrenceUntil: v.recurrenceUntil,
              }));
            }}
            anchorDate={parseLocal(form.startISO)}
          />

          <RemindersEditor
            value={form.reminders ?? (form.reminderMinutes != null ? [form.reminderMinutes] : [])}
            onChange={(arr) => setForm((f) => ({ ...f, reminders: arr, reminderMinutes: undefined }))}
          />


          <textarea
            placeholder="Mô tả (tuỳ chọn)"
            value={form.description || ""}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {item ? (
            <button
              onClick={() => onDelete(item.id)}
              className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Xoá
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">
              Huỷ
            </button>
            <button
              onClick={() => {
                if (!form.title.trim()) return;
                onSave({ ...form, title: form.title.trim() });
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]"
            >
              <CalendarIcon className="h-4 w-4" /> Lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Recurrence Editor ----------------- */
type RecurrenceValue = {
  recurrence: RecurrenceFreq;
  recurrenceRule?: RecurrenceRule;
  recurrenceUntil?: string;
};

function RecurrenceEditor({
  value,
  onChange,
  anchorDate,
}: {
  value: RecurrenceValue;
  onChange: (v: RecurrenceValue) => void;
  anchorDate: Date;
}) {
  // "preset" controls top-level dropdown including "custom"
  const preset = value.recurrence;
  const rule = value.recurrenceRule;
  const showCustom = preset === "custom";

  function setPreset(p: RecurrenceFreq) {
    if (p === "none") {
      onChange({ recurrence: "none", recurrenceRule: undefined, recurrenceUntil: undefined });
      return;
    }
    if (p === "custom") {
      onChange({
        recurrence: "custom",
        recurrenceRule: rule || { freq: "weekly", interval: 1, byWeekDays: [((anchorDate.getDay() + 6) % 7) as WeekDay] },
        recurrenceUntil: value.recurrenceUntil,
      });
      return;
    }
    onChange({ recurrence: p, recurrenceRule: undefined, recurrenceUntil: value.recurrenceUntil });
  }

  function patchRule(p: Partial<RecurrenceRule>) {
    const next: RecurrenceRule = { freq: rule?.freq || "weekly", ...rule, ...p };
    onChange({ recurrence: "custom", recurrenceRule: next, recurrenceUntil: undefined });
  }

  // End mode: never | until | count
  const endMode: "never" | "until" | "count" = showCustom
    ? rule?.count
      ? "count"
      : rule?.until
        ? "until"
        : "never"
    : value.recurrenceUntil
      ? "until"
      : "never";

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <label className="text-xs font-semibold text-muted-foreground">Lặp lại</label>
      </div>
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value as RecurrenceFreq)}
        className="w-full rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
      >
        {(Object.keys(RECURRENCE_LABELS) as RecurrenceFreq[]).map((k) => (
          <option key={k} value={k}>{RECURRENCE_LABELS[k]}</option>
        ))}
      </select>

      {showCustom && rule && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Lặp mỗi</span>
            <input
              type="number"
              min={1}
              max={99}
              value={rule.interval ?? 1}
              onChange={(e) => patchRule({ interval: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-sm"
            />
            <select
              value={rule.freq}
              onChange={(e) => patchRule({ freq: e.target.value as RecurrenceRule["freq"] })}
              className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
            >
              <option value="daily">ngày</option>
              <option value="weekly">tuần</option>
              <option value="monthly">tháng</option>
              <option value="yearly">năm</option>
            </select>
          </div>

          {rule.freq === "weekly" && (
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Vào các thứ</div>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_SHORT.map((label, i) => {
                  const wd = i as WeekDay;
                  const active = rule.byWeekDays?.includes(wd);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const cur = new Set(rule.byWeekDays || []);
                        if (active) cur.delete(wd); else cur.add(wd);
                        patchRule({ byWeekDays: Array.from(cur).sort() as WeekDay[] });
                      }}
                      className={cn(
                        "h-8 w-9 rounded-full border text-xs font-semibold transition-all",
                        active
                          ? "bg-gradient-brand text-white border-transparent shadow-soft"
                          : "border-border bg-background text-muted-foreground hover:border-primary",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => patchRule({ byWeekDays: [0, 1, 2, 3, 4] })}
                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-accent/10"
                >T2-T6</button>
                <button
                  type="button"
                  onClick={() => patchRule({ byWeekDays: [5, 6] })}
                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-accent/10"
                >Cuối tuần</button>
                <button
                  type="button"
                  onClick={() => patchRule({ byWeekDays: [0, 1, 2, 3, 4, 5, 6] })}
                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-accent/10"
                >Mỗi ngày</button>
              </div>
            </div>
          )}

          {rule.freq === "monthly" && (
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Theo</div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={rule.monthlyMode !== "dayOfWeek"}
                    onChange={() => patchRule({ monthlyMode: "dayOfMonth" })}
                  />
                  Ngày {anchorDate.getDate()} hằng tháng
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={rule.monthlyMode === "dayOfWeek"}
                    onChange={() => patchRule({ monthlyMode: "dayOfWeek" })}
                  />
                  {(() => {
                    const nth = Math.ceil(anchorDate.getDate() / 7);
                    const wd = (anchorDate.getDay() + 6) % 7;
                    return `${nth === 5 ? "Cuối cùng" : `Lần ${nth}`} ${WEEKDAY_SHORT[wd]} của tháng`;
                  })()}
                </label>
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 text-xs text-muted-foreground">Kết thúc</div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={endMode === "never"}
                  onChange={() => patchRule({ count: undefined, until: undefined })}
                />
                Không bao giờ
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={endMode === "until"}
                  onChange={() => patchRule({ count: undefined, until: ymd(anchorDate) })}
                />
                Đến ngày
                {endMode === "until" && (
                  <input
                    type="date"
                    value={rule.until || ""}
                    onChange={(e) => patchRule({ until: e.target.value || undefined, count: undefined })}
                    className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                  />
                )}
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={endMode === "count"}
                  onChange={() => patchRule({ count: 10, until: undefined })}
                />
                Sau
                {endMode === "count" && (
                  <>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={rule.count ?? 10}
                      onChange={(e) => patchRule({ count: Math.max(1, Number(e.target.value) || 1), until: undefined })}
                      className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-xs"
                    />
                    <span>lần</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      )}

      {!showCustom && preset !== "none" && (
        <div className="mt-2">
          <label className="text-xs text-muted-foreground">Lặp đến ngày (tuỳ chọn)</label>
          <input
            type="date"
            value={value.recurrenceUntil || ""}
            onChange={(e) => onChange({ ...value, recurrenceUntil: e.target.value || undefined })}
            className="w-full rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
      )}

      <div className="mt-2 text-[11px] italic text-muted-foreground">
        {describeRecurrence({
          recurrence: preset,
          recurrenceRule: rule,
          recurrenceUntil: value.recurrenceUntil,
        } as CalendarItem)}
      </div>
    </div>
  );
}

/* ----------------- Reminders Editor (multi) ----------------- */
function RemindersEditor({
  value,
  onChange,
}: {
  value: number[];
  onChange: (v: number[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function fmt(min: number) {
    if (min === 0) return "Đúng giờ";
    if (min < 60) return `${min} phút trước`;
    if (min < 1440) return `${Math.round(min / 60)} giờ trước`;
    return `${Math.round(min / 1440)} ngày trước`;
  }

  function add(min: number) {
    if (value.includes(min)) return;
    onChange([...value, min].sort((a, b) => b - a));
    setPickerOpen(false);
  }

  function remove(min: number) {
    onChange(value.filter((v) => v !== min));
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <label className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Bell className="h-3 w-3" /> Nhắc nhở
      </label>
      {value.length === 0 ? (
        <p className="mb-2 text-xs text-muted-foreground">Chưa có nhắc nhở</p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary"
            >
              {fmt(m)}
              <button
                type="button"
                onClick={() => remove(m)}
                className="rounded-full p-0.5 hover:bg-primary/20"
                aria-label="Xoá nhắc nhở"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent/10"
        >
          <Plus className="h-3 w-3" /> Thêm nhắc nhở
        </button>
        {pickerOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {REMINDER_PRESETS.filter((p) => !value.includes(p.value)).map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => add(p.value)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent/10"
              >
                {p.label}
              </button>
            ))}
            {REMINDER_PRESETS.every((p) => value.includes(p.value)) && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Đã thêm hết</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
