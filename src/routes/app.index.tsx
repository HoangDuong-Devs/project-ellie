import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Wallet,
  Target,
  Timer,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Flame,
  PlusCircle,
  Kanban,
  MessageCircle,
} from "lucide-react";
import { useAssistantInsights } from "@/hooks/useAssistantInsights";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Tổng quan — ProjectEllie" }] }),
  component: Dashboard,
});

function Dashboard() {
  const i = useAssistantInsights();
  const now = new Date();

  const greeting = (() => {
    const h = now.getHours();
    if (h < 11) return "Chào buổi sáng";
    if (h < 14) return "Chào buổi trưa";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  })();

  const dateLabel = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const max7 = Math.max(1, ...i.last7DaysExpense.map((d) => d.amount));
  const total7DaysExpense = i.last7DaysExpense.reduce((sum, d) => sum + d.amount, 0);
  const avg7DaysExpense = total7DaysExpense / Math.max(1, i.last7DaysExpense.length);
  const topDayExpense = i.last7DaysExpense.reduce<{ label: string; amount: number } | null>(
    (best, d) => (!best || d.amount > best.amount ? { label: d.label, amount: d.amount } : best),
    null,
  );
  const activeSpendDays = i.last7DaysExpense.filter((d) => d.amount > 0).length;
  const has7DaysExpense = total7DaysExpense > 0;

  const stats = [
    {
      title: "Thu tháng",
      value: formatVND(i.income),
      icon: TrendingUp,
      to: "/app/finance" as const,
      tone: "from-blue-400/80 to-cyan-400/80",
    },
    {
      title: "Chi tháng",
      value: formatVND(i.expense),
      icon: TrendingDown,
      to: "/app/finance" as const,
      tone: "from-pink-400/80 to-rose-400/80",
    },
    {
      title: "Mục tiêu",
      value: `${i.activeGoals.length}`,
      sub: `${i.avgGoalProgress.toFixed(0)}% trung bình`,
      icon: Target,
      to: "/app/goals" as const,
      tone: "from-purple-400/80 to-fuchsia-400/80",
    },
    {
      title: "Focus hôm nay",
      value: `${i.todayPomos} 🍅`,
      sub: i.focusStreak > 0 ? `${i.focusStreak} ngày streak` : "Chưa có streak",
      icon: Timer,
      to: "/app/focus" as const,
      tone: "from-cyan-400/80 to-blue-400/80",
    },
  ];

  const quickActions = [
    { label: "Thêm chi tiêu", to: "/app/finance" as const, icon: Wallet },
    { label: "Tạo sự kiện", to: "/app/calendar" as const, icon: CalendarIcon },
    { label: "Bắt đầu Focus", to: "/app/focus" as const, icon: Timer },
    { label: "Mục tiêu mới", to: "/app/goals" as const, icon: Target },
    { label: "Bảng công việc", to: "/app/work" as const, icon: Kanban },
    { label: "Hỏi trợ lý", to: "/app/assistant" as const, icon: MessageCircle },
  ];

  return (
    <div className="space-y-6">
      {/* HERO — Elysia-inspired pastel rainbow gradient */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-brand-soft p-6 sm:p-10 shadow-soft"
      >
        {/* decorative blobs */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-50 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />

        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <Sparkles className="h-3 w-3" />
            {dateLabel}
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            <span className="text-gradient-brand">{greeting},</span>
            <br />
            <span className="text-foreground/90">đây là tổng quan của bạn ✨</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Tài chính, lịch, mục tiêu và focus — tất cả gọn trong một trang. Hỏi trợ lý nếu bạn
            muốn bản tóm tắt nhanh.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/app/assistant"
              className="btn-pill btn-pill-primary"
            >
              <Sparkles className="h-4 w-4" /> Mở trợ lý Ellie
            </Link>
            <Link
              to="/app/finance"
              className="btn-pill btn-pill-soft"
            >
              <PlusCircle className="h-4 w-4" /> Thêm giao dịch
            </Link>
          </div>
        </div>
      </motion.section>

      {/* STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((c, idx) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <Link
              to={c.to}
              className="group relative block overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div
                className={cn(
                  "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-soft",
                  c.tone,
                )}
              >
                <c.icon className="h-5 w-5" />
              </div>
              <div className="text-xs text-muted-foreground">{c.title}</div>
              <div className="mt-1 text-xl font-bold tracking-tight">{c.value}</div>
              {c.sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{c.sub}</div>}
            </Link>
          </motion.div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Spending chart 7 days */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h3 className="font-semibold">Chi tiêu 7 ngày qua</h3>
              <p className="text-xs text-muted-foreground">
                Hôm nay: {formatVND(i.todaySpend)}
                {i.suggestedDaily > 0 && ` · Gợi ý ${formatVND(i.suggestedDaily)}/ngày`}
              </p>
            </div>
            <Link
              to="/app/finance"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Chi tiết <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex h-44 items-end gap-2">
            {i.last7DaysExpense.map((d, idx) => {
              const h = (d.amount / max7) * 100;
              const isToday = idx === i.last7DaysExpense.length - 1;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex h-full w-full items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(4, h)}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.04 }}
                      className={cn(
                        "w-full rounded-t-xl transition-colors",
                        isToday
                          ? "bg-gradient-brand shadow-soft"
                          : "bg-muted-foreground/35",
                      )}
                      title={formatVND(d.amount)}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px]",
                      isToday ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/40 px-3 py-2">
              <div className="text-muted-foreground">Tổng 7 ngày</div>
              <div className="font-semibold text-foreground">{formatVND(total7DaysExpense)}</div>
            </div>
            <div className="rounded-2xl bg-muted/40 px-3 py-2">
              <div className="text-muted-foreground">Trung bình/ngày</div>
              <div className="font-semibold text-foreground">{formatVND(avg7DaysExpense)}</div>
            </div>
            <div className="rounded-2xl bg-muted/40 px-3 py-2">
              <div className="text-muted-foreground">Cao nhất</div>
              <div className="font-semibold text-foreground">
                {topDayExpense && topDayExpense.amount > 0
                  ? `${topDayExpense.label}: ${formatVND(topDayExpense.amount)}`
                  : "Chưa có"}
              </div>
            </div>
          </div>
          {!has7DaysExpense && (
            <p className="mt-2 text-xs text-muted-foreground">
              7 ngày gần đây chưa có giao dịch chi tiêu nào.
            </p>
          )}
          {has7DaysExpense && (
            <p className="mt-2 text-xs text-muted-foreground">
              Có chi tiêu trong {activeSpendDays}/7 ngày gần nhất.
            </p>
          )}
        </section>

        {/* Budget */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Ngân sách tháng</h3>
            <Link
              to="/app/finance"
              className="text-xs font-medium text-primary hover:underline"
            >
              Quản lý
            </Link>
          </div>
          {i.budgetTotal === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Chưa đặt ngân sách.
              <br />
              <Link to="/app/finance" className="font-medium text-primary hover:underline">
                Đặt ngay →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight">
                    {formatVND(i.remainingBudget)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {formatVND(i.budgetTotal)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      i.budgetUsedPct >= 100
                        ? "bg-destructive"
                        : i.budgetUsedPct >= 80
                          ? "bg-amber-500"
                          : "bg-gradient-brand",
                    )}
                    style={{ width: `${Math.min(100, i.budgetUsedPct)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{i.budgetUsedPct.toFixed(0)}% đã dùng</span>
                  <span>còn {i.daysLeftInMonth} ngày</span>
                </div>
              </div>
              {i.suggestedDaily > 0 && (
                <div className="rounded-2xl bg-gradient-brand-soft p-3 text-xs">
                  <div className="font-medium text-foreground">💡 Gợi ý</div>
                  <div className="mt-0.5 text-muted-foreground">
                    Có thể chi tới{" "}
                    <span className="font-semibold text-foreground">
                      {formatVND(i.suggestedDaily)}
                    </span>{" "}
                    mỗi ngày để bám ngân sách.
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* SECONDARY GRID */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's events */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Lịch hôm nay</h3>
            <Link to="/app/calendar" className="text-xs font-medium text-primary hover:underline">
              Xem
            </Link>
          </div>
          {i.todayEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Không có sự kiện ☕
            </p>
          ) : (
            <ul className="space-y-2">
              {i.todayEvents.slice(0, 4).map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-3 rounded-2xl bg-muted/40 px-3 py-2 text-sm"
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gradient-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {e.allDay
                        ? "Cả ngày"
                        : new Date(e.startISO).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Goals */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Mục tiêu</h3>
            <Link to="/app/goals" className="text-xs font-medium text-primary hover:underline">
              Quản lý
            </Link>
          </div>
          {i.activeGoals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Đặt mục tiêu đầu tiên 🎯
            </p>
          ) : (
            <ul className="space-y-3">
              {i.activeGoals.slice(0, 3).map((g) => {
                const done = g.steps.filter((s) => s.done).length;
                const pct = g.steps.length ? Math.round((done / g.steps.length) * 100) : 0;
                return (
                  <li key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{g.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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

        {/* Focus streak */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Focus streak</h3>
            <Link to="/app/focus" className="text-xs font-medium text-primary hover:underline">
              Bắt đầu
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-soft">
              <Flame className="h-7 w-7" />
            </div>
            <div>
              <div className="text-3xl font-bold leading-none">{i.focusStreak}</div>
              <div className="text-xs text-muted-foreground">ngày liên tiếp</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl bg-muted/40 p-2.5">
              <div className="text-muted-foreground">Hôm nay</div>
              <div className="text-sm font-semibold">
                {i.todayPomos} phiên · {i.todayFocusMinutes}p
              </div>
            </div>
            <div className="rounded-2xl bg-muted/40 p-2.5">
              <div className="text-muted-foreground">Tuần này</div>
              <div className="text-sm font-semibold">{i.weekPomos} phiên</div>
            </div>
          </div>
        </section>
      </div>

      {/* QUICK ACTIONS */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-3 font-semibold">Truy cập nhanh</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((q) => (
            <Link
              key={q.to + q.label}
              to={q.to}
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-background p-3 text-xs font-medium transition hover:border-primary hover:bg-gradient-brand-soft"
            >
              <q.icon className="h-5 w-5 text-primary transition group-hover:scale-110" />
              <span className="text-center">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="overflow-hidden rounded-3xl bg-gradient-brand p-6 text-white shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">Sẵn sàng tập trung?</h3>
            <p className="text-sm text-white/90">
              Bắt đầu một phiên Pomodoro 25 phút và tiến gần hơn tới mục tiêu.
            </p>
          </div>
          <Link
            to="/app/focus"
            className="btn-pill btn-pill-inverse hover:scale-105"
          >
            <CheckCircle2 className="h-4 w-4" /> Bắt đầu Focus
          </Link>
        </div>
      </section>
    </div>
  );
}
