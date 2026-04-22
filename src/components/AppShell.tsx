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
} from "lucide-react";
import { AssistantBubble } from "@/components/assistant/AssistantBubble";
import { useEffect, useState } from "react";
import { applyTheme, getInitialDark } from "@/lib/theme";
import { cn } from "@/lib/utils";

type NavItem = {
  to:
    | "/app"
    | "/app/finance"
    | "/app/calendar"
    | "/app/focus"
    | "/app/goals"
    | "/app/work"
    | "/app/assistant";
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
];

export function AppShell() {
  const { pathname } = useLocation();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const d = getInitialDark();
    setDark(d);
    applyTheme(d);
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
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-6">
          {NAV.map((n) => {
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-all",
                    active && "bg-gradient-brand text-white shadow-soft",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                </div>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
