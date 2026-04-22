import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CalendarItem } from "@/types/calendar";
import type { Transaction } from "@/types/finance";
import type { MonthlyBudget } from "@/services/finance-service";
import type { Goal } from "@/types/goals";
import type { PomodoroSession } from "@/types/focus";
import { getReminderOffsets, parseLocal, expandOccurrences, fmtTime } from "@/lib/calendar";
import { formatVND } from "@/lib/format";
import { listNotifications } from "@/services/notification-api-client";
import {
  pushNotification,
  type NotificationCategory,
  type NotificationKind,
} from "./useNotificationCenter";
import {
  getNotificationPrefs as getNotificationPrefsCache,
  isCategoryEnabled,
  isDailyDigestEnabled,
} from "./useNotificationPrefs";
import type { AppNotification } from "@/types/notifications";

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
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
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
export function useReminderScheduler(items: CalendarItem[], enabled = true) {
  const sentAttemptRef = useRef<Map<string, number>>(new Map());
  const sentDedupeRef = useRef<Set<string>>(new Set());
  const tickingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    function reminderAttemptFromKey(dedupeKey: string | undefined, baseKey: string): number | null {
      if (!dedupeKey) return null;
      if (dedupeKey === baseKey) return 1;
      const prefix = `${baseKey}#`;
      if (!dedupeKey.startsWith(prefix)) return null;
      const raw = Number(dedupeKey.slice(prefix.length));
      if (!Number.isFinite(raw) || raw < 1) return 1;
      return Math.trunc(raw);
    }

    function getReminderRecord(
      notifications: AppNotification[],
      baseKey: string,
    ): { attempts: number; acknowledged: boolean } {
      let attempts = sentAttemptRef.current.get(baseKey) ?? 0;
      let acknowledged = false;
      for (const n of notifications) {
        const attempt = reminderAttemptFromKey(n.dedupeKey, baseKey);
        if (attempt == null) continue;
        attempts = Math.max(attempts, attempt);
        if (n.read) acknowledged = true;
      }
      return { attempts, acknowledged };
    }

    async function tick() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      try {
        const now = Date.now();
        const prefs = getNotificationPrefsCache();
        const reminderRepeatEnabled = prefs.reminderRepeatEnabled;
        const reminderRepeatIntervalMs = Math.max(1, prefs.reminderRepeatIntervalMinutes) * 60_000;
        const reminderRepeatMaxTimes = Math.max(1, prefs.reminderRepeatMaxTimes);
        const maxAttempts = reminderRepeatEnabled ? reminderRepeatMaxTimes : 1;

        let notifications: AppNotification[] = [];
        if (reminderRepeatEnabled) {
          try {
            const res = await listNotifications();
            notifications = res.items;
          } catch {
            notifications = [];
          }
        }

        for (const it of items) {
          const offsets = getReminderOffsets(it);
          if (offsets.length === 0) continue;
          const start = parseLocal(it.startISO).getTime();
          for (const off of offsets) {
            const fireAt = start - off * 60_000;
            const baseKey = `${it.id}@${fireAt}`;
            const { attempts, acknowledged } = getReminderRecord(notifications, baseKey);
            if (acknowledged || attempts >= maxAttempts) continue;

            const nextFireAt = fireAt + attempts * reminderRepeatIntervalMs;
            const attempt = attempts + 1;
            const dedupeKey = `${baseKey}#${attempt}`;
            if (sentDedupeRef.current.has(dedupeKey)) continue;
            if (now >= nextFireAt && now <= nextFireAt + 60_000) {
              const body =
                off === 0
                  ? it.description || "Sự kiện bắt đầu ngay bây giờ"
                  : `Bắt đầu trong ${off < 60 ? `${off} phút` : off < 1440 ? `${Math.round(off / 60)} giờ` : `${Math.round(off / 1440)} ngày`}`;
              notify(it.title, body, {
                category: "calendar",
                kind: "info",
                tag: dedupeKey,
                dedupeKey,
              });
              sentAttemptRef.current.set(baseKey, attempt);
              sentDedupeRef.current.add(dedupeKey);
            }
          }
        }
      } finally {
        tickingRef.current = false;
      }
    }

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [enabled, items]);
}

export const useInAppReminderWatcher = useReminderScheduler;

/**
 * Watches monthly budget vs current spending and fires notifications when
 * thresholds are crossed (80%, 100% of total or per-category, or daily
 * suggested spend exceeded today). Each alert key fires only once per session.
 */
export function useBudgetWatcher(
  tx: Transaction[],
  budget: MonthlyBudget | undefined,
  enabled = true,
) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, tx, budget]);
}

export const useInAppBudgetWatcher = useBudgetWatcher;

/** Logs every newly-added transaction into the notification center. */
export function useTransactionLogger(tx: Transaction[], enabled = true) {
  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, tx]);
}

export const useInAppTransactionWatcher = useTransactionLogger;

/** Notifies when a goal becomes completed (all steps done or completed flag flips). */
export function useGoalCompletionWatcher(goals: Goal[], enabled = true) {
  const prevRef = useRef<Map<string, boolean> | null>(null);
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, goals]);
}

export const useInAppGoalWatcher = useGoalCompletionWatcher;

/** Notifies when a new pomodoro session is logged. */
export function useFocusLogger(sessions: PomodoroSession[], enabled = true) {
  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, sessions]);
}

export const useInAppFocusWatcher = useFocusLogger;

/**
 * Once per day (per browser), produces a digest of today's events at first
 * load, and at 08:00 if the app is open. Avoids duplication via dedupeKey.
 */
export function useDailyEventsDigest(items: CalendarItem[], enabled = true) {
  const checkedRef = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    if (checkedRef.current) return;
    checkedRef.current = true;
    if (!isDailyDigestEnabled()) return;
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
  }, [enabled, items]);
}

export const useInAppDailyDigestWatcher = useDailyEventsDigest;

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}
