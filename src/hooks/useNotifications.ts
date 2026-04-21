import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CalendarItem } from "@/types/calendar";
import type { Transaction } from "@/types/finance";
import type { MonthlyBudget } from "@/components/finance/MonthlyBudgetCard";
import { getReminderOffsets, parseLocal } from "@/lib/calendar";
import { formatVND } from "@/lib/format";

/** Show notification: native push if permitted, otherwise in-app toast. */
function notify(title: string, body: string, tag?: string, kind: "info" | "warn" | "danger" = "info") {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag });
    } catch {
      /* fallback below */
    }
  }
  // Always also show in-app toast so user sees it while using the app
  if (kind === "danger") toast.error(title, { description: body, id: tag });
  else if (kind === "warn") toast.warning(title, { description: body, id: tag });
  else toast(title, { description: body, id: tag });
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
            notify(it.title, body, key, "info");
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

    // Total budget thresholds
    const pct = spent / budget.total;
    if (pct >= 1) {
      fireOnce(`budget:over:${monthKey}`, () =>
        notify(
          "Vượt ngân sách tháng",
          `Bạn đã chi ${formatVND(spent)} / ${formatVND(budget.total)} (vượt ${formatVND(spent - budget.total)}).`,
          `budget-over-${monthKey}`,
          "danger",
        ),
      );
    } else if (pct >= 0.8) {
      fireOnce(`budget:80:${monthKey}`, () =>
        notify(
          "Sắp đạt giới hạn ngân sách",
          `Đã chi ${Math.round(pct * 100)}% ngân sách tháng (${formatVND(spent)} / ${formatVND(budget.total)}).`,
          `budget-80-${monthKey}`,
          "warn",
        ),
      );
    }

    // Per-category thresholds
    Object.entries(budget.categories || {}).forEach(([cat, limit]) => {
      if (!limit) return;
      const used = spentByCat[cat] || 0;
      const cpct = used / limit;
      if (cpct >= 1) {
        fireOnce(`budget:cat-over:${monthKey}:${cat}`, () =>
          notify(
            `Vượt hạn mức danh mục: ${cat}`,
            `Đã chi ${formatVND(used)} / ${formatVND(limit)}.`,
            `budget-cat-over-${monthKey}-${cat}`,
            "danger",
          ),
        );
      } else if (cpct >= 0.8) {
        fireOnce(`budget:cat-80:${monthKey}:${cat}`, () =>
          notify(
            `Sắp vượt danh mục: ${cat}`,
            `Đã dùng ${Math.round(cpct * 100)}% (${formatVND(used)} / ${formatVND(limit)}).`,
            `budget-cat-80-${monthKey}-${cat}`,
            "warn",
          ),
        );
      }
    });

    // Daily suggested spend exceeded
    const remaining = Math.max(0, budget.total - spent);
    const suggestPerDay = remaining / daysLeftIncl;
    if (suggestPerDay > 0 && todaySpent > suggestPerDay) {
      fireOnce(`budget:day-over:${todayKey}`, () =>
        notify(
          "Chi tiêu hôm nay vượt gợi ý",
          `Hôm nay đã chi ${formatVND(todaySpent)}, vượt mức gợi ý ${formatVND(suggestPerDay)}/ngày để giữ trong ngân sách.`,
          `budget-day-${todayKey}`,
          "warn",
        ),
      );
    }
  }, [tx, budget]);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}
