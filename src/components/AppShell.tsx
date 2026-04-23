import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  CalendarRange,
  Timer,
  Target,
  Settings,
  Sparkles,
  Moon,
  Sun,
  Kanban,
  MessageCircle,
  Bot,
} from "lucide-react";
import { AssistantBubble } from "@/components/assistant/AssistantBubble";
import { useEffect, useState } from "react";
import { applyTheme, getInitialDark } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  useReminderScheduler,
  useBudgetWatcher,
  useTransactionLogger,
  useGoalCompletionWatcher,
  useFocusLogger,
  useDailyEventsDigest,
  requestNotificationPermission,
} from "@/hooks/useNotifications";
import { NotificationCenter } from "@/components/NotificationCenter";
import type { CalendarItem } from "@/types/calendar";
import type { Transaction } from "@/types/finance";
import type { MonthlyBudget } from "@/components/finance/MonthlyBudgetCard";
import type { Goal } from "@/types/goals";
import type { PomodoroSession } from "@/types/focus";

type NavItem = {
  to:
    | "/app"
    | "/app/finance"
    | "/app/calendar"
    | "/app/focus"
    | "/app/goals"
    | "/app/work"
    | "/app/assistant"
    | "/app/companion";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { to: "/app", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { to: "/app/finance", label: "Tài chính", icon: Wallet },
  { to: "/app/calendar", label: "Lịch", icon: CalendarRange },
  { to: "/app/work", label: "Công việc", icon: Kanban },
  { to: "/app/focus", label: "Focus", icon: Timer },
  { to: "/app/goals", label: "Mục tiêu", icon: Target },
  { to: "/app/assistant", label: "Trợ lý", icon: MessageCircle },
  { to: "/app/companion", label: "Ellie", icon: Bot },
];

export function AppShell() {
  const { pathname } = useLocation();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const d = getInitialDark();
    setDark(d);
    applyTheme(d);
  }, []);

  // Global notification watchers — run on every page so reminders & budget
  // alerts fire regardless of which tab the user is currently on.
  const [calendarItems] = useLocalStorage<CalendarItem[]>("ellie:calendar-items", []);
  const [tx] = useLocalStorage<Transaction[]>("ellie:transactions", []);
  const [budget] = useLocalStorage<MonthlyBudget>("ellie:monthly-budget", {
    total: 0,
    categories: {},
  });
  const [goals] = useLocalStorage<Goal[]>("ellie:goals", []);
  const [pomodoros] = useLocalStorage<PomodoroSession[]>("ellie:pomodoros", []);
  useReminderScheduler(calendarItems);
  useBudgetWatcher(tx, budget);
  useTransactionLogger(tx);
  useGoalCompletionWatcher(goals);
  useFocusLogger(pomodoros);
  useDailyEventsDigest(calendarItems);

  // Ask for notification permission once per session if not already decided.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      requestNotificationPermission();
    }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    try {
      localStorage.setItem("ellie-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-soft">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gradient-brand">ProjectEllie</span>
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => {
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-brand text-white shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <n.icon className="h-4.5 w-4.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <Link
            to="/app/settings"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              isActive("/app/settings")
                ? "bg-gradient-brand text-white shadow-soft"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <Settings className="h-4 w-4" /> Cài đặt
          </Link>
          <button
            onClick={toggleDark}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Chế độ sáng" : "Chế độ tối"}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-soft">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gradient-brand">ProjectEllie</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <button
            onClick={toggleDark}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent/10"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/app/settings"
            className="rounded-full p-2 text-muted-foreground hover:bg-accent/10"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="lg:pl-64">
        {/* Desktop top bar with notification bell */}
        <div className="sticky top-0 z-20 hidden h-14 items-center justify-end gap-1 border-b border-border bg-background/80 px-6 backdrop-blur-xl lg:flex">
          <NotificationCenter />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
          <Outlet />
        </div>
      </main>

      <Toaster position="top-right" richColors closeButton />
      <AssistantBubble />

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-7">
          {NAV.map((n) => {
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-9 items-center justify-center rounded-full transition-all",
                    active && "bg-gradient-brand text-white shadow-soft",
                  )}
                >
                  <n.icon className="h-3.5 w-3.5" />
                </div>
                <span className="w-full truncate text-center">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
