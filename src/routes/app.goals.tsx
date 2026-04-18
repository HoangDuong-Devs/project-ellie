import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plus, Trash2, Trophy } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { uid } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import type { Goal } from "@/types/goals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/goals")({
  head: () => ({ meta: [{ title: "Mục tiêu — ProjectEllie" }] }),
  component: Goals,
});

function Goals() {
  const [goals, setGoals] = useLocalStorage<Goal[]>("ellie:goals", []);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");

  function add() {
    if (!title.trim()) return;
    setGoals([
      {
        id: uid(),
        title: title.trim(),
        description: desc.trim() || undefined,
        deadline: deadline || undefined,
        steps: [],
        completed: false,
        createdAt: new Date().toISOString(),
      },
      ...goals,
    ]);
    setTitle("");
    setDesc("");
    setDeadline("");
  }

  function remove(id: string) {
    setGoals(goals.filter((g) => g.id !== id));
  }

  function addStep(goalId: string, stepTitle: string) {
    if (!stepTitle.trim()) return;
    setGoals(
      goals.map((g) =>
        g.id === goalId
          ? { ...g, steps: [...g.steps, { id: uid(), title: stepTitle.trim(), done: false }] }
          : g,
      ),
    );
  }

  function toggleStep(goalId: string, stepId: string) {
    setGoals(
      goals.map((g) => {
        if (g.id !== goalId) return g;
        const steps = g.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
        const allDone = steps.length > 0 && steps.every((s) => s.done);
        return { ...g, steps, completed: allDone };
      }),
    );
  }

  function removeStep(goalId: string, stepId: string) {
    setGoals(
      goals.map((g) =>
        g.id === goalId ? { ...g, steps: g.steps.filter((s) => s.id !== stepId) } : g,
      ),
    );
  }

  return (
    <div>
      <PageHeader title="Mục tiêu" description="Đặt mục tiêu, chia nhỏ thành các bước, theo dõi tiến độ." />

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-4 font-semibold">Tạo mục tiêu mới</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input
            placeholder="Tên mục tiêu"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="Mô tả (tuỳ chọn)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
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

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {goals.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Chưa có mục tiêu nào — hãy tạo cái đầu tiên 🎯
          </div>
        )}
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onRemove={() => remove(g.id)}
            onAddStep={(s) => addStep(g.id, s)}
            onToggle={(sid) => toggleStep(g.id, sid)}
            onRemoveStep={(sid) => removeStep(g.id, sid)}
          />
        ))}
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  onRemove,
  onAddStep,
  onToggle,
  onRemoveStep,
}: {
  goal: Goal;
  onRemove: () => void;
  onAddStep: (s: string) => void;
  onToggle: (sid: string) => void;
  onRemoveStep: (sid: string) => void;
}) {
  const [step, setStep] = useState("");
  const done = goal.steps.filter((s) => s.done).length;
  const pct = goal.steps.length ? Math.round((done / goal.steps.length) * 100) : 0;
  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold">{goal.title}</h3>
            {goal.completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                <Trophy className="h-3 w-3" /> Hoàn thành
              </span>
            )}
          </div>
          {goal.description && (
            <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>
          )}
          {daysLeft !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {daysLeft >= 0 ? `Còn ${daysLeft} ngày` : `Quá hạn ${-daysLeft} ngày`} · hạn{" "}
              {new Date(goal.deadline!).toLocaleDateString("vi-VN")}
            </p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Tiến độ</span>
          <span className="font-semibold text-foreground">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {goal.steps.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => onToggle(s.id)}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                s.done
                  ? "border-transparent bg-gradient-brand text-white"
                  : "border-muted-foreground/40 hover:border-primary",
              )}
            >
              {s.done && <Check className="h-3 w-3" />}
            </button>
            <span className={cn("flex-1 text-sm", s.done && "text-muted-foreground line-through")}>
              {s.title}
            </span>
            <button
              onClick={() => onRemoveStep(s.id)}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          placeholder="Thêm bước..."
          value={step}
          onChange={(e) => setStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAddStep(step);
              setStep("");
            }
          }}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => {
            onAddStep(step);
            setStep("");
          }}
          className="rounded-xl bg-gradient-brand px-3 py-1.5 text-sm font-semibold text-white shadow-soft"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
