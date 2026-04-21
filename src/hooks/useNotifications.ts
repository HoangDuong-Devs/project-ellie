import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CalendarItem } from "@/types/calendar";
import type { Transaction } from "@/types/finance";
import type { MonthlyBudget } from "@/components/finance/MonthlyBudgetCard";
import type { Goal } from "@/types/goals";
import type { PomodoroSession } from "@/types/focus";
import { getReminderOffsets, parseLocal, expandOccurrences, fmtTime } from "@/lib/calendar";
import { formatVND } from "@/lib/format";
import {
  pushNotification,
  type NotificationCategory,
  type NotificationKind,
} from "./useNotificationCenter";
import { isCategoryEnabled, isDailyDigestEnabled } from "./useNotificationPrefs";

/** Show notification: native push + in-app toast + persistent center entry. */
function notify(
  title: string,
  body: string,
  opts: {
    category: NotificationCategory;
    kind?: NotificationKind;
    tag?: string;
    dedupeKey?: string;
  },
) {
  const kind = opts.kind ?? "info";
  // Respect user preferences — completely skip if category is disabled.
  if (!isCategoryEnabled(opts.category)) return;
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag: opts.tag });
    } catch {
      /* fallback below */
    }
  }
  if (kind === "danger") toast.error(title, { description: body, id: opts.tag });
  else if (kind === "warn") toast.warning(title, { description: body, id: opts.tag });
  else if (kind === "success") toast.success(title, { description: body, id: opts.tag });
  else toast(title, { description: body, id: opts.tag });

  pushNotification({
    title,
    body,
    category: opts.category,
    kind,
    dedupeKey: opts.dedupeKey ?? opts.tag,
  });
}

/**
 * Background scheduler: every 30s scan upcoming items, fire one notification
 * per reminder offset when its window crosses "now". Tracks fired keys to
 * prevent duplicates within the session.
 */
export function useReminderScheduler(items: CalendarItem[]) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;

    function tick() {
      const now = Date.now();
      for (const it of items) {
        const offsets = getReminderOffsets(it);
        if (offsets.length === 0) continue;
        const start = parseLocal(it.startISO).getTime();
        for (const off of offsets) {
          const fireAt = start - off * 60_000;
          const key = `${it.id}@${fireAt}`;
          if (firedRef.current.has(key)) continue;
          if (now >= fireAt && now <= fireAt + 60_000) {
            const body =
              off === 0
                ? it.description || "Sự kiện bắt đầu ngay bây giờ"
                : `Bắt đầu trong ${off < 60 ? `${off} phút` : off < 1440 ? `${Math.round(off / 60)} giờ` : `${Math.round(off / 1440)} ngày`}`;
            notify(it.title, body, { category: "calendar", kind: "info", tag: key, dedupeKey: key });
            firedRef.current.add(key);
          }
        }
      }
    }

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [items]);
}

/**
 * Watches monthly budget vs current spending and fires notifications when
 * thresholds are crossed (80%, 100% of total or per-category, or daily
 * suggested spend exceeded today). Each alert key fires only once per session.
 */
export function useBudgetWatcher(tx: Transaction[], budget: MonthlyBudget | undefined) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!budget || !budget.total) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const dim = new Date(year, month + 1, 0).getDate();
    const day = now.getDate();
    const daysLeftIncl = Math.max(1, dim - day + 1);
    const todayKey = now.toISOString().slice(0, 10);

    const monthExpenses = tx.filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === month && d.getFullYear() === year;
    });
    const spent = monthExpenses.reduce((s, t) => s + t.amount, 0);
    const todaySpent = monthExpenses
      .filter((t) => new Date(t.date).toISOString().slice(0, 10) === todayKey)
      .reduce((s, t) => s + t.amount, 0);
    const spentByCat: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;
    });

    function fireOnce(key: string, fn: () => void) {
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);
      fn();
    }

    const pct = spent / budget.total;
    if (pct >= 1) {
      fireOnce(`budget:over:${monthKey}`, () =>
        notify(
          "Vượt ngân sách tháng",
          `Bạn đã chi ${formatVND(spent)} / ${formatVND(budget.total)} (vượt ${formatVND(spent - budget.total)}).`,
          { category: "finance", kind: "danger", tag: `budget-over-${monthKey}` },
        ),
      );
    } else if (pct >= 0.8) {
      fireOnce(`budget:80:${monthKey}`, () =>
        notify(
          "Sắp đạt giới hạn ngân sách",
          `Đã chi ${Math.round(pct * 100)}% ngân sách tháng (${formatVND(spent)} / ${formatVND(budget.total)}).`,
          { category: "finance", kind: "warn", tag: `budget-80-${monthKey}` },
        ),
      );
    }

    Object.entries(budget.categories || {}).forEach(([cat, limit]) => {
      if (!limit) return;
      const used = spentByCat[cat] || 0;
      const cpct = used / limit;
      if (cpct >= 1) {
        fireOnce(`budget:cat-over:${monthKey}:${cat}`, () =>
          notify(
            `Vượt hạn mức danh mục: ${cat}`,
            `Đã chi ${formatVND(used)} / ${formatVND(limit)}.`,
            { category: "finance", kind: "danger", tag: `budget-cat-over-${monthKey}-${cat}` },
          ),
        );
      } else if (cpct >= 0.8) {
        fireOnce(`budget:cat-80:${monthKey}:${cat}`, () =>
          notify(
            `Sắp vượt danh mục: ${cat}`,
            `Đã dùng ${Math.round(cpct * 100)}% (${formatVND(used)} / ${formatVND(limit)}).`,
            { category: "finance", kind: "warn", tag: `budget-cat-80-${monthKey}-${cat}` },
          ),
        );
      }
    });

    const remaining = Math.max(0, budget.total - spent);
    const suggestPerDay = remaining / daysLeftIncl;
    if (suggestPerDay > 0 && todaySpent > suggestPerDay) {
      fireOnce(`budget:day-over:${todayKey}`, () =>
        notify(
          "Chi tiêu hôm nay vượt gợi ý",
          `Hôm nay đã chi ${formatVND(todaySpent)}, vượt mức gợi ý ${formatVND(suggestPerDay)}/ngày để giữ trong ngân sách.`,
          { category: "finance", kind: "warn", tag: `budget-day-${todayKey}` },
        ),
      );
    }
  }, [tx, budget]);
}

/** Logs every newly-added transaction into the notification center. */
export function useTransactionLogger(tx: Transaction[]) {
  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(tx.map((t) => t.id));
      return;
    }
    for (const t of tx) {
      if (seenRef.current.has(t.id)) continue;
      seenRef.current.add(t.id);
      const isExpense = t.type === "expense";
      const verb = isExpense ? "Đã chi" : "Đã thu";
      const title = `${verb} ${formatVND(t.amount)} · ${t.category}`;
      const body = t.note ? t.note : `Giao dịch ${isExpense ? "chi tiêu" : "thu nhập"} mới`;
      notify(title, body, {
        category: "finance",
        kind: isExpense ? "info" : "success",
        dedupeKey: `tx:${t.id}`,
      });
    }
  }, [tx]);
}

/** Notifies when a goal becomes completed (all steps done or completed flag flips). */
export function useGoalCompletionWatcher(goals: Goal[]) {
  const prevRef = useRef<Map<string, boolean> | null>(null);
  useEffect(() => {
    const now = new Map(goals.map((g) => [g.id, g.completed]));
    if (prevRef.current === null) {
      prevRef.current = now;
      return;
    }
    for (const g of goals) {
      const before = prevRef.current.get(g.id);
      if (before === false && g.completed) {
        notify("🎯 Hoàn thành mục tiêu!", `"${g.title}" đã hoàn tất. Chúc mừng bạn!`, {
          category: "goal",
          kind: "success",
          dedupeKey: `goal-done:${g.id}`,
        });
      }
    }
    prevRef.current = now;
  }, [goals]);
}

/** Notifies when a new pomodoro session is logged. */
export function useFocusLogger(sessions: PomodoroSession[]) {
  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(sessions.map((s) => s.id));
      return;
    }
    for (const s of sessions) {
      if (seenRef.current.has(s.id)) continue;
      seenRef.current.add(s.id);
      notify("⏱ Hoàn thành phiên Focus", `Bạn vừa tập trung ${s.minutes} phút. Tốt lắm!`, {
        category: "focus",
        kind: "success",
        dedupeKey: `focus:${s.id}`,
      });
    }
  }, [sessions]);
}

/**
 * Once per day (per browser), produces a digest of today's events at first
 * load, and at 08:00 if the app is open. Avoids duplication via dedupeKey.
 */
export function useDailyEventsDigest(items: CalendarItem[]) {
  const checkedRef = useRef(false);
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    if (items.length === 0) return;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const todays = expandOccurrences(items, start, end).sort(
      (a, b) => a.instanceStart.getTime() - b.instanceStart.getTime(),
    );
    const todayKey = now.toISOString().slice(0, 10);
    if (todays.length === 0) {
      notify("📅 Hôm nay không có sự kiện", "Một ngày thoải mái — hãy tận dụng nhé!", {
        category: "calendar",
        kind: "info",
        dedupeKey: `digest:${todayKey}`,
      });
      return;
    }
    const lines = todays
      .slice(0, 5)
      .map((o) => `${o.allDay ? "Cả ngày" : fmtTime(o.instanceStart)} · ${o.title}`)
      .join("\n");
    const more = todays.length > 5 ? `\n…và ${todays.length - 5} sự kiện khác` : "";
    notify(`📅 Hôm nay có ${todays.length} sự kiện`, lines + more, {
      category: "calendar",
      kind: "info",
      dedupeKey: `digest:${todayKey}`,
    });
  }, [items]);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}
