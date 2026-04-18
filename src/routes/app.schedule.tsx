import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { uid } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import type { Priority, ScheduleItem, Todo } from "@/types/schedule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/schedule")({
  head: () => ({ meta: [{ title: "Lịch trình & Todo — ProjectEllie" }] }),
  component: Schedule,
});

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7..20

function Schedule() {
  const [todos, setTodos] = useLocalStorage<Todo[]>("ellie:todos", []);
  const [items, setItems] = useLocalStorage<ScheduleItem[]>("ellie:schedule", []);
  const [tab, setTab] = useState<"todos" | "week">("todos");

  return (
    <div>
      <PageHeader
        title="Lịch trình & Todo"
        description="Quản lý công việc theo mức ưu tiên và lên thời khóa biểu tuần."
      />

      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1 shadow-soft">
        <button
          onClick={() => setTab("todos")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            tab === "todos" ? "bg-gradient-brand text-white shadow-soft" : "text-muted-foreground",
          )}
        >
          Todo
        </button>
        <button
          onClick={() => setTab("week")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            tab === "week" ? "bg-gradient-brand text-white shadow-soft" : "text-muted-foreground",
          )}
        >
          Lịch tuần
        </button>
      </div>

      {tab === "todos" ? <TodosView todos={todos} setTodos={setTodos} /> : <WeekView items={items} setItems={setItems} />}
    </div>
  );
}

function TodosView({ todos, setTodos }: { todos: Todo[]; setTodos: (t: Todo[]) => void }) {
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

  return (
    <>
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
    </>
  );
}

function WeekView({
  items,
  setItems,
}: {
  items: ScheduleItem[];
  setItems: (i: ScheduleItem[]) => void;
}) {
  function addAt(day: number, hour: number) {
    const title = window.prompt("Tên sự kiện?");
    if (!title) return;
    setItems([
      ...items,
      { id: uid(), title, day, startHour: hour, duration: 1 },
    ]);
  }
  function remove(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  return (
    <section className="overflow-x-auto rounded-3xl border border-border bg-card p-3 shadow-soft">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div />
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold">
              {d}
            </div>
          ))}
        </div>
        {HOURS.map((h) => (
          <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40">
            <div className="px-2 py-3 text-right text-xs text-muted-foreground">{h}:00</div>
            {DAYS.map((_, di) => {
              const it = items.find((x) => x.day === di && x.startHour === h);
              return (
                <button
                  key={di}
                  onClick={() => (it ? remove(it.id) : addAt(di, h))}
                  className={cn(
                    "h-12 border-l border-border/40 text-xs transition-all",
                    it
                      ? "bg-gradient-brand text-white shadow-soft"
                      : "text-transparent hover:bg-muted/40 hover:text-muted-foreground",
                  )}
                  title={it ? "Click để xóa" : "Click để thêm"}
                >
                  {it ? it.title : "+"}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 px-2 text-xs text-muted-foreground">
        Mẹo: Click ô trống để thêm sự kiện, click sự kiện để xóa.
      </p>
    </section>
  );
}
