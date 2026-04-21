import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Wallet, Target, Timer, CheckCircle2 } from "lucide-react";
import { listTodos } from "@/services/calendar-api-client";
import { getFinanceSummary } from "@/services/finance-api-client";
import { listGoals } from "@/services/goals-api-client";
import { listFocusSessions } from "@/services/focus-api-client";
import { formatVND } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { useDataAutoRefresh } from "@/services/api-live-sync";
import type { Todo } from "@/types/schedule";
import type { Goal } from "@/types/goals";
import type { PomodoroSession } from "@/types/focus";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Tổng quan — ProjectEllie" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const now = new Date();
    const [finance, todosRes, goalsRes, sessionsRes] = await Promise.all([
      getFinanceSummary(now.getFullYear(), now.getMonth()),
      listTodos(),
      listGoals(),
      listFocusSessions(),
    ]);
    setSummary(finance.summary);
    setTodos(todosRes.todos);
    setGoals(goalsRes.goals);
    setSessions(sessionsRes.sessions);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const now = new Date();
        const [finance, todosRes, goalsRes, sessionsRes] = await Promise.all([
          getFinanceSummary(now.getFullYear(), now.getMonth()),
          listTodos(),
          listGoals(),
          listFocusSessions(),
        ]);
        if (!active) return;
        setSummary(finance.summary);
        setTodos(todosRes.todos);
        setGoals(goalsRes.goals);
        setSessions(sessionsRes.sessions);
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
  useDataAutoRefresh(refresh, "all");

  const today = new Date().toDateString();
  const todayTodos = todos.filter((t) => !t.done).slice(0, 5);
  const activeGoals = goals.filter((g) => !g.completed).slice(0, 3);
  const todayPomos = sessions.filter((s) => new Date(s.date).toDateString() === today).length;

  const cards = [
    {
      title: "Thu tháng này",
      value: formatVND(summary.income),
      icon: Wallet,
      to: "/app/finance",
      color: "from-emerald-400 to-cyan-400",
    },
    {
      title: "Chi tháng này",
      value: formatVND(summary.expense),
      icon: Wallet,
      to: "/app/finance",
      color: "from-rose-400 to-pink-500",
    },
    {
      title: "Mục tiêu đang chạy",
      value: `${activeGoals.length}`,
      icon: Target,
      to: "/app/goals",
      color: "from-fuchsia-400 to-purple-500",
    },
    {
      title: "Pomodoro hôm nay",
      value: `${todayPomos} 🍅`,
      icon: Timer,
      to: "/app/focus",
      color: "from-pink-400 to-cyan-400",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Chào mừng trở lại 👋"
        description="Đây là tổng quan ngày hôm nay của bạn."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link
              to={c.to}
              className="group block rounded-3xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div
                className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${c.color} text-white shadow-soft`}
              >
                <c.icon className="h-5 w-5" />
              </div>
              <div className="text-xs text-muted-foreground">{c.title}</div>
              <div className="mt-1 text-xl font-bold">{c.value}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Việc cần làm</h3>
            <Link
              to="/app/calendar"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Xem tất cả <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Đang tải dữ liệu...</p>
          ) : todayTodos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Không có việc nào — đi nghỉ ngơi nhé! ☕
            </p>
          ) : (
            <ul className="space-y-2">
              {todayTodos.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      t.priority === "high"
                        ? "bg-rose-500"
                        : t.priority === "medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                  />
                  {t.title}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Mục tiêu đang theo đuổi</h3>
            <Link
              to="/app/goals"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Quản lý <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Đang tải dữ liệu...</p>
          ) : activeGoals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Đặt mục tiêu đầu tiên của bạn 🎯
            </p>
          ) : (
            <ul className="space-y-3">
              {activeGoals.map((g) => {
                const done = g.steps.filter((s) => s.done).length;
                const pct = g.steps.length ? Math.round((done / g.steps.length) * 100) : 0;
                return (
                  <li key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{g.title}</span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-brand transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-brand p-6 text-white shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">Sẵn sàng tập trung?</h3>
            <p className="text-sm text-white/90">
              Bắt đầu một phiên Pomodoro 25 phút và tiến gần hơn tới mục tiêu.
            </p>
          </div>
          <Link
            to="/app/focus"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-soft hover:scale-105"
          >
            <CheckCircle2 className="h-4 w-4" /> Bắt đầu Focus
          </Link>
        </div>
      </section>
    </div>
  );
}
