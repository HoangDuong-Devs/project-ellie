import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { uid } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import type { Priority, Todo } from "@/types/schedule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/schedule")({
  head: () => ({ meta: [{ title: "Lịch trình & Todo — ProjectEllie" }] }),
  component: Schedule,
});

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Schedule() {
  const [todos, setTodos] = useLocalStorage<Todo[]>("ellie:todos", []);
  const [weekOffset, setWeekOffset] = useState(0);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");

  function add() {
    if (!title.trim()) return;
    setTodos([
      {
        id: uid(),
        title: title.trim(),
        priority,
        dueDate: due || undefined,
        done: false,
        createdAt: new Date().toISOString(),
      },
      ...todos,
    ]);
    setTitle("");
    setDue("");
  }
  function toggle(id: string) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }
  function remove(id: string) {
    setTodos(todos.filter((t) => t.id !== id));
  }

  const today = new Date().toDateString();
  const groups = {
    "Hôm nay": todos.filter(
      (t) => !t.done && (!t.dueDate || new Date(t.dueDate).toDateString() === today),
    ),
    "Sắp tới": todos.filter(
      (t) => !t.done && t.dueDate && new Date(t.dueDate).toDateString() !== today,
    ),
    "Đã xong": todos.filter((t) => t.done),
  };

  const weekStart = useMemo(() => {
    const s = startOfWeek(new Date());
    s.setDate(s.getDate() + weekOffset * 7);
    return s;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const todosByDay = useMemo(() => {
    const map = new Map<string, Todo[]>();
    weekDays.forEach((d) => map.set(ymd(d), []));
    todos.forEach((t) => {
      if (!t.dueDate) return;
      const key = ymd(new Date(t.dueDate));
      if (map.has(key)) map.get(key)!.push(t);
    });
    return map;
  }, [todos, weekDays]);

  const todayKey = ymd(new Date());

  return (
    <div>
      <PageHeader
        title="Lịch trình & Todo"
        description="Thêm việc cần làm và xem lịch tuần."
      />

      {/* Add Todo */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            placeholder="Việc cần làm..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="high">Ưu tiên cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={add}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> Thêm
          </button>
        </div>
      </section>

      {/* Todo groups */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {Object.entries(groups).map(([label, list]) => (
          <section key={label} className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{label}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{list.length}</span>
            </div>
            {list.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Trống</p>
            ) : (
              <ul className="space-y-2">
                {list.map((t) => (
                  <li
                    key={t.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-transparent bg-muted/40 p-2.5",
                      t.done && "opacity-60",
                    )}
                  >
                    <button
                      onClick={() => toggle(t.id)}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        t.done
                          ? "border-transparent bg-gradient-brand text-white"
                          : "border-muted-foreground/40 hover:border-primary",
                      )}
                    >
                      {t.done && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={cn("truncate text-sm font-medium", t.done && "line-through")}>
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            t.priority === "high" && "bg-rose-500",
                            t.priority === "medium" && "bg-amber-500",
                            t.priority === "low" && "bg-emerald-500",
                          )}
                        />
                        {t.priority === "high" ? "Cao" : t.priority === "medium" ? "TB" : "Thấp"}
                        {t.dueDate && ` · ${new Date(t.dueDate).toLocaleDateString("vi-VN")}`}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(t.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* Week view of todos */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Lịch tuần</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((v) => v - 1)}
              className="rounded-full border border-border p-1.5 hover:bg-accent/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {weekDays[0].toLocaleDateString("vi-VN")} – {weekDays[6].toLocaleDateString("vi-VN")}
            </span>
            <button
              onClick={() => setWeekOffset((v) => v + 1)}
              className="rounded-full border border-border p-1.5 hover:bg-accent/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="ml-2 rounded-full border border-border px-3 py-1 text-xs hover:bg-accent/10"
            >
              Hôm nay
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {weekDays.map((d, i) => {
            const key = ymd(d);
            const list = todosByDay.get(key) || [];
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={cn(
                  "rounded-2xl border p-3 transition-all",
                  isToday ? "border-primary bg-gradient-to-br from-pink-500/5 to-cyan-500/5" : "border-border bg-muted/30",
                )}
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{DAY_LABELS[i]}</span>
                  <span className={cn("text-lg font-bold", isToday && "text-gradient-brand")}>{d.getDate()}</span>
                </div>
                {list.length === 0 ? (
                  <p className="py-2 text-center text-[11px] text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1.5">
                    {list.map((t) => (
                      <li
                        key={t.id}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg bg-background p-1.5 text-[11px]",
                          t.done && "opacity-50 line-through",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                            t.priority === "high" && "bg-rose-500",
                            t.priority === "medium" && "bg-amber-500",
                            t.priority === "low" && "bg-emerald-500",
                          )}
                        />
                        <span className="truncate">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
