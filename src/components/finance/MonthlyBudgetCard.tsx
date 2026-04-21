import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2, Wallet } from "lucide-react";
import { DEFAULT_MONTHLY_BUDGET, type MonthlyBudget } from "@/services/finance-service";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/format";
import { EXPENSE_CATEGORIES, type Transaction } from "@/types/finance";
export function MonthlyBudgetCard({
  budget,
  setBudget,
  tx,
  year,
  month,
}: {
  budget: MonthlyBudget | undefined;
  setBudget: (b: MonthlyBudget) => void | Promise<unknown>;
  tx: Transaction[];
  year: number;
  month: number;
}) {
  const b: MonthlyBudget = {
    ...DEFAULT_MONTHLY_BUDGET,
    ...(budget ?? {}),
    categories: { ...(budget?.categories ?? {}) },
  };
  const [editing, setEditing] = useState(false);
  const [totalInput, setTotalInput] = useState(String(b.total || ""));
  const [catInputs, setCatInputs] = useState<Record<string, string>>(
    Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, String(b.categories[c] ?? "")])),
  );

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const dim = new Date(year, month + 1, 0).getDate();
  const dayNow = isCurrentMonth ? today.getDate() : dim;
  const daysLeft = Math.max(0, dim - dayNow);
  const daysLeftIncl = Math.max(1, dim - dayNow + 1);

  const monthExpenses = useMemo(
    () =>
      tx.filter((t) => {
        const d = new Date(t.date);
        return t.type === "expense" && d.getMonth() === month && d.getFullYear() === year;
      }),
    [tx, year, month],
  );
  const spent = monthExpenses.reduce((s, t) => s + t.amount, 0);
  const spentByCat = useMemo(() => {
    const m: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      m[t.category] = (m[t.category] || 0) + t.amount;
    });
    return m;
  }, [monthExpenses]);

  const hasBudget = b.total > 0;
  const remaining = Math.max(0, b.total - spent);
  const overTotal = spent > b.total && hasBudget;
  const pct = hasBudget ? Math.min(100, (spent / b.total) * 100) : 0;
  const suggestPerDay = hasBudget && isCurrentMonth ? remaining / daysLeftIncl : 0;
  const avgPerDay = dayNow > 0 ? spent / dayNow : 0;
  const projection = hasBudget ? avgPerDay * dim : 0;
  const projectionOver = hasBudget && projection > b.total;

  function save() {
    const next: MonthlyBudget = {
      total: Number(totalInput) || 0,
      categories: Object.fromEntries(
        Object.entries(catInputs)
          .map(([k, v]) => [k, Number(v) || 0])
          .filter(([, v]) => (v as number) > 0),
      ) as Record<string, number>,
    };
    setBudget(next);
    setEditing(false);
  }
  function clearAll() {
    setBudget({ total: 0, categories: {} });
    setTotalInput("");
    setCatInputs(Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, ""])));
    setEditing(false);
  }

  const catEntries = Object.entries(b.categories).filter(([, v]) => v > 0);

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Ngân sách tháng {month + 1}/{year}</h3>
        <button
          onClick={() => setEditing((v) => !v)}
          className="ml-auto rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent/10"
        >
          {editing ? "Hủy" : hasBudget ? "Chỉnh sửa" : "Đặt ngân sách"}
        </button>
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Hạn mức tổng (VND)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="VD: 10000000"
              value={totalInput}
              onChange={(e) => setTotalInput(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Theo danh mục (tùy chọn)</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs">{c}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={catInputs[c] ?? ""}
                    onChange={(e) => setCatInputs((p) => ({ ...p, [c]: e.target.value }))}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" /> Lưu ngân sách
            </button>
            {hasBudget && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-xs hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xóa ngân sách
              </button>
            )}
          </div>
        </div>
      ) : !hasBudget ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Chưa đặt ngân sách. Nhấn "Đặt ngân sách" để bắt đầu kiểm soát chi tiêu trong tháng.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">Tổng đã chi</span>
              <span className={cn("font-semibold", overTotal ? "text-destructive" : "text-foreground")}>
                {formatVND(spent)} / {formatVND(b.total)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  overTotal ? "bg-destructive" : pct > 80 ? "bg-orange-500" : "bg-gradient-brand",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <BudgetStat
              label={overTotal ? "Vượt hạn mức" : "Còn lại"}
              value={overTotal ? spent - b.total : remaining}
              tone={overTotal ? "danger" : "good"}
            />
            <BudgetStat
              label={isCurrentMonth ? `Còn ${daysLeftIncl} ngày` : "Hết tháng"}
              value={isCurrentMonth ? suggestPerDay : 0}
              hint={isCurrentMonth ? "Gợi ý chi/ngày" : undefined}
              tone="neutral"
            />
            <BudgetStat
              label="TB đã chi/ngày"
              value={avgPerDay}
              hint={isCurrentMonth ? `Dự kiến cuối tháng: ${formatVND(projection)}` : undefined}
              tone={projectionOver ? "warn" : "neutral"}
            />
          </div>

          {isCurrentMonth && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-2xl border p-3 text-sm",
                overTotal
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : projectionOver
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
              )}
            >
              {overTotal || projectionOver ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                {overTotal ? (
                  <>Bạn đã vượt hạn mức {formatVND(spent - b.total)}. Hãy giảm chi tiêu trong {daysLeftIncl} ngày còn lại.</>
                ) : projectionOver ? (
                  <>Với tốc độ hiện tại, bạn sẽ vượt ngân sách khoảng {formatVND(projection - b.total)}. Hãy chi tối đa {formatVND(suggestPerDay)}/ngày để giữ trong hạn mức.</>
                ) : (
                  <>Bạn còn {formatVND(remaining)} cho {daysLeftIncl} ngày. Có thể chi khoảng {formatVND(suggestPerDay)}/ngày.</>
                )}
              </div>
            </div>
          )}

          {catEntries.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Theo danh mục</div>
              <ul className="space-y-2">
                {catEntries.map(([cat, limit]) => {
                  const used = spentByCat[cat] || 0;
                  const cpct = Math.min(100, (used / limit) * 100);
                  const over = used > limit;
                  return (
                    <li key={cat} className="rounded-xl border border-border bg-muted/30 p-2.5">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium">{cat}</span>
                        <span className={cn("font-semibold", over ? "text-destructive" : "text-muted-foreground")}>
                          {formatVND(used)} / {formatVND(limit)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            over ? "bg-destructive" : cpct > 80 ? "bg-orange-500" : "bg-gradient-brand",
                          )}
                          style={{ width: `${cpct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BudgetStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone: "good" | "warn" | "danger" | "neutral";
}) {
  const toneCls =
    tone === "good"
      ? "text-cyan-600 dark:text-cyan-400"
      : tone === "warn"
        ? "text-orange-600 dark:text-orange-400"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-bold", toneCls)}>{formatVND(value)}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
