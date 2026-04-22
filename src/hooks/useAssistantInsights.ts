import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { formatVND } from "@/lib/format";
import type { Transaction } from "@/types/finance";
import type { Todo } from "@/types/schedule";
import type { CalendarItem } from "@/types/calendar";
import type { Goal } from "@/types/goals";
import type { PomodoroSession } from "@/types/focus";
import type { MonthlyBudget } from "@/components/finance/MonthlyBudgetCard";

export interface AssistantInsights {
  // Finance
  income: number;
  expense: number;
  balance: number;
  todaySpend: number;
  yesterdaySpend: number;
  budgetTotal: number;
  budgetUsedPct: number; // 0..100+
  remainingBudget: number;
  daysLeftInMonth: number;
  suggestedDaily: number;
  topCategory: { name: string; amount: number } | null;
  last7DaysExpense: { date: string; label: string; amount: number }[];

  // Calendar
  todayEvents: CalendarItem[];
  upcomingEvents: CalendarItem[];

  // Tasks
  openTodos: Todo[];

  // Goals
  activeGoals: Goal[];
  completedGoals: number;
  avgGoalProgress: number; // 0..100

  // Focus
  todayPomos: number;
  weekPomos: number;
  focusStreak: number; // consecutive days with ≥1 pomo
  todayFocusMinutes: number;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function useAssistantInsights(): AssistantInsights {
  const [tx] = useLocalStorage<Transaction[]>("ellie:transactions", []);
  const [todos] = useLocalStorage<Todo[]>("ellie:todos", []);
  const [items] = useLocalStorage<CalendarItem[]>("ellie:calendar-items", []);
  const [goals] = useLocalStorage<Goal[]>("ellie:goals", []);
  const [sessions] = useLocalStorage<PomodoroSession[]>("ellie:pomodoros", []);
  const [budget] = useLocalStorage<MonthlyBudget>("ellie:monthly-budget", {
    total: 0,
    categories: {},
  });

  return useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const dim = new Date(y, m + 1, 0).getDate();
    const today = startOfDay(now).getTime();
    const yesterday = today - 24 * 3600 * 1000;

    const monthTx = tx.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const todaySpend = tx
      .filter((t) => t.type === "expense" && startOfDay(new Date(t.date)).getTime() === today)
      .reduce((s, t) => s + t.amount, 0);
    const yesterdaySpend = tx
      .filter((t) => t.type === "expense" && startOfDay(new Date(t.date)).getTime() === yesterday)
      .reduce((s, t) => s + t.amount, 0);

    // Top category this month
    const catMap = new Map<string, number>();
    monthTx
      .filter((t) => t.type === "expense")
      .forEach((t) => catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount));
    let topCategory: AssistantInsights["topCategory"] = null;
    catMap.forEach((amount, name) => {
      if (!topCategory || amount > topCategory.amount) topCategory = { name, amount };
    });

    const budgetTotal = budget?.total ?? 0;
    const budgetUsedPct = budgetTotal > 0 ? (expense / budgetTotal) * 100 : 0;
    const remainingBudget = Math.max(0, budgetTotal - expense);
    const daysLeftIncl = Math.max(1, dim - now.getDate() + 1);
    const daysLeftInMonth = Math.max(0, dim - now.getDate());
    const suggestedDaily = budgetTotal > 0 ? remainingBudget / daysLeftIncl : 0;

    // Last 7 days expense series
    const last7DaysExpense: AssistantInsights["last7DaysExpense"] = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(new Date(now));
      day.setDate(day.getDate() - i);
      const t = day.getTime();
      const amount = tx
        .filter((x) => x.type === "expense" && startOfDay(new Date(x.date)).getTime() === t)
        .reduce((s, x) => s + x.amount, 0);
      last7DaysExpense.push({
        date: day.toISOString(),
        label: day.toLocaleDateString("vi-VN", { weekday: "short" }).replace("Th ", "T"),
        amount,
      });
    }

    // Calendar today / upcoming (single occurrences only; recurrence not expanded here)
    const todayEvents = items.filter((it) => {
      const d = new Date(it.startISO);
      return startOfDay(d).getTime() === today;
    });
    const upcomingEvents = items
      .filter((it) => new Date(it.startISO).getTime() > now.getTime())
      .sort((a, b) => +new Date(a.startISO) - +new Date(b.startISO))
      .slice(0, 5);

    const openTodos = todos.filter((t) => !t.done);

    const activeGoals = goals.filter((g) => !g.completed);
    const completedGoals = goals.filter((g) => g.completed).length;
    const avgGoalProgress = activeGoals.length
      ? activeGoals.reduce((s, g) => {
          if (!g.steps.length) return s;
          return s + (g.steps.filter((st) => st.done).length / g.steps.length) * 100;
        }, 0) / activeGoals.length
      : 0;

    // Focus
    const todayPomos = sessions.filter(
      (s) => startOfDay(new Date(s.date)).getTime() === today,
    ).length;
    const todayFocusMinutes = sessions
      .filter((s) => startOfDay(new Date(s.date)).getTime() === today)
      .reduce((acc, s) => acc + s.minutes, 0);
    const weekPomos = sessions.filter(
      (s) => today - startOfDay(new Date(s.date)).getTime() < 7 * 24 * 3600 * 1000,
    ).length;

    // Streak (consecutive days from today backwards with ≥1 pomo)
    let focusStreak = 0;
    const setDays = new Set(
      sessions.map((s) => startOfDay(new Date(s.date)).getTime()),
    );
    for (let i = 0; i < 365; i++) {
      const t = today - i * 24 * 3600 * 1000;
      if (setDays.has(t)) focusStreak++;
      else if (i === 0) {
        // allow streak to count yesterday if today is empty but yesterday had a pomo
        continue;
      } else break;
    }

    return {
      income,
      expense,
      balance: income - expense,
      todaySpend,
      yesterdaySpend,
      budgetTotal,
      budgetUsedPct,
      remainingBudget,
      daysLeftInMonth,
      suggestedDaily,
      topCategory,
      last7DaysExpense,
      todayEvents,
      upcomingEvents,
      openTodos,
      activeGoals,
      completedGoals,
      avgGoalProgress,
      todayPomos,
      weekPomos,
      focusStreak,
      todayFocusMinutes,
    };
  }, [tx, todos, items, goals, sessions, budget]);
}

export interface AssistantCommand {
  id: string;
  label: string;
  description: string;
  emoji: string;
  run: (i: AssistantInsights) => string;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });

export const ASSISTANT_COMMANDS: AssistantCommand[] = [
  {
    id: "baocao-ngay",
    label: "/baocao-ngay",
    emoji: "📊",
    description: "Báo cáo chi tiêu hôm nay",
    run: (i) => {
      const diff = i.todaySpend - i.yesterdaySpend;
      const trend =
        i.yesterdaySpend === 0
          ? "Hôm qua không có chi tiêu nào để so sánh."
          : diff > 0
            ? `Tăng **${formatVND(diff)}** so với hôm qua.`
            : diff < 0
              ? `Giảm **${formatVND(-diff)}** so với hôm qua. 👏`
              : "Bằng đúng hôm qua.";
      return [
        `### 📊 Báo cáo hôm nay`,
        ``,
        `- Đã chi: **${formatVND(i.todaySpend)}**`,
        `- Hôm qua: ${formatVND(i.yesterdaySpend)}`,
        `- ${trend}`,
        i.suggestedDaily > 0
          ? `- Gợi ý theo ngân sách: **${formatVND(i.suggestedDaily)}** / ngày`
          : `- Bạn chưa đặt ngân sách tháng — vào /app/finance để đặt.`,
      ].join("\n");
    },
  },
  {
    id: "ngansach",
    label: "/ngansach",
    emoji: "💰",
    description: "Tình hình ngân sách tháng",
    run: (i) => {
      if (i.budgetTotal === 0)
        return `### 💰 Ngân sách\n\nBạn chưa đặt ngân sách tháng. Vào **/app/finance** để đặt nhé.`;
      const status =
        i.budgetUsedPct >= 100
          ? "🚨 Đã vượt ngân sách"
          : i.budgetUsedPct >= 80
            ? "⚠️ Sắp vượt ngân sách"
            : "✅ Đang trong tầm kiểm soát";
      return [
        `### 💰 Ngân sách tháng`,
        ``,
        `- Tổng: **${formatVND(i.budgetTotal)}**`,
        `- Đã chi: **${formatVND(i.expense)}** (${i.budgetUsedPct.toFixed(0)}%)`,
        `- Còn lại: **${formatVND(i.remainingBudget)}** trong ${i.daysLeftInMonth} ngày`,
        `- Gợi ý mỗi ngày: **${formatVND(i.suggestedDaily)}**`,
        `- ${status}`,
        i.topCategory
          ? `- Hạng mục chi nhiều nhất: **${i.topCategory.name}** (${formatVND(i.topCategory.amount)})`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  {
    id: "lich-homnay",
    label: "/lich-homnay",
    emoji: "📅",
    description: "Sự kiện trong ngày",
    run: (i) => {
      if (i.todayEvents.length === 0 && i.upcomingEvents.length === 0)
        return `### 📅 Lịch hôm nay\n\nKhông có sự kiện nào — tận hưởng ngày trống nhé! ☕`;
      const today = i.todayEvents
        .map((e) => `- **${e.allDay ? "Cả ngày" : fmtTime(e.startISO)}** — ${e.title}`)
        .join("\n");
      const upcoming = i.upcomingEvents
        .slice(0, 3)
        .map((e) => `- ${fmtDate(e.startISO)} ${e.allDay ? "" : fmtTime(e.startISO)} — ${e.title}`)
        .join("\n");
      return [
        `### 📅 Lịch hôm nay`,
        i.todayEvents.length ? today : "_Hôm nay không có sự kiện._",
        ``,
        `**Sắp tới:**`,
        upcoming || "_Trống_",
      ].join("\n");
    },
  },
  {
    id: "muctieu",
    label: "/muctieu",
    emoji: "🎯",
    description: "Tiến độ mục tiêu",
    run: (i) => {
      if (i.activeGoals.length === 0)
        return `### 🎯 Mục tiêu\n\nBạn chưa có mục tiêu nào đang chạy. Đặt một cái tại **/app/goals** nhé!`;
      const list = i.activeGoals
        .slice(0, 5)
        .map((g) => {
          const done = g.steps.filter((s) => s.done).length;
          const pct = g.steps.length ? Math.round((done / g.steps.length) * 100) : 0;
          return `- **${g.title}** — ${pct}% (${done}/${g.steps.length} bước)`;
        })
        .join("\n");
      return [
        `### 🎯 Mục tiêu (${i.activeGoals.length} đang chạy, ${i.completedGoals} hoàn thành)`,
        ``,
        list,
        ``,
        `Tiến độ trung bình: **${i.avgGoalProgress.toFixed(0)}%**`,
      ].join("\n");
    },
  },
  {
    id: "focus",
    label: "/focus",
    emoji: "🍅",
    description: "Thống kê Pomodoro",
    run: (i) =>
      [
        `### 🍅 Focus`,
        ``,
        `- Hôm nay: **${i.todayPomos} phiên** (${i.todayFocusMinutes} phút)`,
        `- Tuần này: **${i.weekPomos} phiên**`,
        `- Streak: **${i.focusStreak} ngày liên tiếp** ${i.focusStreak >= 3 ? "🔥" : ""}`,
      ].join("\n"),
  },
  {
    id: "tongquan",
    label: "/tongquan",
    emoji: "✨",
    description: "Tổng hợp mọi thứ",
    run: (i) =>
      [
        `### ✨ Tổng quan hôm nay`,
        ``,
        `**💰 Tài chính** — Đã chi ${formatVND(i.todaySpend)}${i.suggestedDaily ? ` / gợi ý ${formatVND(i.suggestedDaily)}` : ""}`,
        `**📅 Lịch** — ${i.todayEvents.length} sự kiện hôm nay, ${i.upcomingEvents.length} sắp tới`,
        `**🎯 Mục tiêu** — ${i.activeGoals.length} đang chạy (${i.avgGoalProgress.toFixed(0)}%)`,
        `**🍅 Focus** — ${i.todayPomos} phiên hôm nay, streak ${i.focusStreak} ngày`,
        `**📝 Việc cần làm** — ${i.openTodos.length} mục chưa xong`,
      ].join("\n"),
  },
];
