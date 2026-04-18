import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon, CalendarDays,
  Plus, Target, Trash2, TrendingDown, TrendingUp, Wallet, Filter, X,
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatVND, uid } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Transaction, type TxType,
} from "@/types/finance";
import type { SavingsGoal } from "@/types/calendar";

export const Route = createFileRoute("/app/finance")({
  head: () => ({ meta: [{ title: "Tài chính — ProjectEllie" }] }),
  component: Finance,
});

const CHART_COLORS = ["#ec4899", "#06b6d4", "#a855f7", "#f43f5e", "#22d3ee", "#f97316", "#10b981"];
type View = "overview" | "list" | "calendar";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Finance() {
  const [tx, setTx] = useLocalStorage<Transaction[]>("ellie:transactions", []);
  const [goals, setGoals] = useLocalStorage<SavingsGoal[]>("ellie:savings-goals", []);
  const [view, setView] = useState<View>("overview");

  // Add form
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Selected month for views
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const summary = useMemo(() => {
    const monthTx = tx.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [tx, year, month]);

  const totalBalance = useMemo(() => {
    return tx.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
  }, [tx]);

  const monthlyData = useMemo(() => {
    const months: { name: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      const inc = tx.filter((t) => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() && t.type === "income";
      }).reduce((s, t) => s + t.amount, 0);
      const exp = tx.filter((t) => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() && t.type === "expense";
      }).reduce((s, t) => s + t.amount, 0);
      months.push({ name: `T${d.getMonth() + 1}`, income: inc, expense: exp });
    }
    return months;
  }, [tx, year, month]);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    tx.filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === month && d.getFullYear() === year;
    }).forEach((t) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [tx, year, month]);

  function add() {
    const a = Number(amount);
    if (!a || a <= 0) return;
    setTx([
      { id: uid(), type, amount: a, category, note: note.trim() || undefined, date: new Date(date).toISOString() },
      ...tx,
    ]);
    setAmount("");
    setNote("");
  }
  function remove(id: string) {
    setTx(tx.filter((t) => t.id !== id));
  }

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  }

  return (
    <div>
      <PageHeader
        title="Tài chính"
        description="Theo dõi thu chi & phân tích chi tiêu của bạn."
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1">
              <button onClick={prevMonth} className="rounded-full p-1 hover:bg-accent/10">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm font-medium">Tháng {month + 1}/{year}</span>
              <button onClick={nextMonth} className="rounded-full p-1 hover:bg-accent/10">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              <ViewBtn active={view === "overview"} onClick={() => setView("overview")} icon={LayoutGrid} label="Tổng quan" />
              <ViewBtn active={view === "list"} onClick={() => setView("list")} icon={ListIcon} label="Danh sách" />
              <ViewBtn active={view === "calendar"} onClick={() => setView("calendar")} icon={CalendarDays} label="Lịch" />
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Thu trong tháng" value={summary.income} icon={TrendingUp} positive />
        <StatCard label="Chi trong tháng" value={summary.expense} icon={TrendingDown} />
        <StatCard label="Số dư tháng" value={summary.balance} icon={Wallet} positive={summary.balance >= 0} />
      </div>

      {/* Add form (always visible) */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-4 font-semibold">Thêm giao dịch</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <select value={type} onChange={(e) => { const v = e.target.value as TxType; setType(v); setCategory(v === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]); }} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="expense">Chi</option>
            <option value="income">Thu</option>
          </select>
          <input type="number" inputMode="numeric" placeholder="Số tiền" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm sm:col-span-2 lg:col-span-1" />
          <button onClick={add} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]">
            <Plus className="h-4 w-4" /> Thêm
          </button>
        </div>
      </section>

      {view === "overview" && (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-4 font-semibold">Thu vs Chi (6 tháng)</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                    <YAxis stroke="currentColor" fontSize={11} tickFormatter={(v) => `${v / 1_000_000}M`} />
                    <Tooltip formatter={(v) => formatVND(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                    <Legend />
                    <Bar dataKey="income" name="Thu" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="expense" name="Chi" fill="#ec4899" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-4 font-semibold">Cơ cấu chi tháng này</h3>
              <div className="h-64">
                {pieData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu</div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatVND(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <SavingsGoalsCard goals={goals} setGoals={setGoals} balance={totalBalance} />
        </>
      )}

      {view === "list" && (
        <ListView tx={tx} onRemove={remove} year={year} month={month} />
      )}

      {view === "calendar" && (
        <CalendarView tx={tx} year={year} month={month} />
      )}
    </div>
  );
}

function ViewBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof LayoutGrid; label: string }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all", active ? "bg-gradient-brand text-white shadow-soft" : "text-muted-foreground hover:text-foreground")}>
      <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon: Icon, positive = false }: { label: string; value: number; icon: typeof Wallet; positive?: boolean }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", positive ? "bg-cyan-500/15 text-cyan-500" : "bg-pink-500/15 text-pink-500")}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold">{formatVND(value)}</div>
    </div>
  );
}

function ListView({ tx, onRemove, year, month }: { tx: Transaction[]; onRemove: (id: string) => void; year: number; month: number }) {
  const [filterType, setFilterType] = useState<"all" | TxType>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return tx
      .filter((t) => {
        const d = new Date(t.date);
        if (d.getMonth() !== month || d.getFullYear() !== year) return false;
        if (filterType !== "all" && t.type !== filterType) return false;
        if (filterCat !== "all" && t.category !== filterCat) return false;
        if (from && d < new Date(from)) return false;
        if (to && d > new Date(to + "T23:59:59")) return false;
        return true;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [tx, filterType, filterCat, from, to, year, month]);

  const allCats = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as "all" | TxType)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option value="all">Tất cả loại</option>
          <option value="income">Thu</option>
          <option value="expense">Chi</option>
        </select>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option value="all">Tất cả danh mục</option>
          {allCats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Từ" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Đến" />
        {(from || to || filterType !== "all" || filterCat !== "all") && (
          <button onClick={() => { setFrom(""); setTo(""); setFilterType("all"); setFilterCat("all"); }} className="rounded-xl border border-border px-3 py-2 text-xs hover:bg-accent/10">Xóa lọc</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Không có giao dịch.</p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", t.type === "income" ? "bg-cyan-500/15 text-cyan-500" : "bg-pink-500/15 text-pink-500")}>
                {t.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">{t.category}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("vi-VN")}{t.note && ` · ${t.note}`}
                </div>
              </div>
              <div className={cn("text-sm font-semibold", t.type === "income" ? "text-cyan-500" : "text-pink-500")}>
                {t.type === "income" ? "+" : "-"}{formatVND(t.amount)}
              </div>
              <button onClick={() => onRemove(t.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CalendarView({ tx, year, month }: { tx: Transaction[]; year: number; month: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7;
    const dim = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date | null; key: string | null }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null, key: null });
    for (let d = 1; d <= dim; d++) {
      const dt = new Date(year, month, d);
      cells.push({ date: dt, key: ymd(dt) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: null });
    return cells;
  }, [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; items: Transaction[] }>();
    tx.forEach((t) => {
      const d = new Date(t.date);
      if (d.getMonth() !== month || d.getFullYear() !== year) return;
      const k = ymd(d);
      if (!map.has(k)) map.set(k, { income: 0, expense: 0, items: [] });
      const cell = map.get(k)!;
      if (t.type === "income") cell.income += t.amount;
      else cell.expense += t.amount;
      cell.items.push(t);
    });
    return map;
  }, [tx, year, month]);

  const todayKey = ymd(new Date());
  const sel = selected ? byDay.get(selected) : null;

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="grid grid-cols-7 border-b border-border pb-2 text-center text-xs font-semibold text-muted-foreground">
        {["T2","T3","T4","T5","T6","T7","CN"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {grid.map((c, i) => {
          if (!c.date) return <div key={i} className="min-h-[80px]" />;
          const data = byDay.get(c.key!);
          const isToday = c.key === todayKey;
          const isSel = c.key === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(c.key)}
              className={cn(
                "min-h-[80px] rounded-xl border p-1.5 text-left transition-all",
                isSel ? "border-primary bg-pink-500/10" : isToday ? "border-primary" : "border-border bg-muted/20 hover:bg-muted/40",
              )}
            >
              <div className="text-sm font-semibold">{c.date.getDate()}</div>
              {data && (
                <div className="mt-1 space-y-0.5 text-[10px] leading-tight">
                  {data.income > 0 && <div className="rounded bg-cyan-500/15 px-1 py-0.5 text-cyan-600 dark:text-cyan-400">+{formatVND(data.income)}</div>}
                  {data.expense > 0 && <div className="rounded bg-pink-500/15 px-1 py-0.5 text-pink-600 dark:text-pink-400">-{formatVND(data.expense)}</div>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {sel && selected && (
        <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
          <h4 className="mb-3 text-sm font-semibold">
            Chi tiết {new Date(selected).toLocaleDateString("vi-VN")}
          </h4>
          <ul className="space-y-2">
            {sel.items.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{t.category}</span>
                  {t.note && <span className="ml-2 text-xs text-muted-foreground">{t.note}</span>}
                </div>
                <span className={cn("font-semibold", t.type === "income" ? "text-cyan-500" : "text-pink-500")}>
                  {t.type === "income" ? "+" : "-"}{formatVND(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SavingsGoalsCard({ goals, setGoals, balance }: { goals: SavingsGoal[]; setGoals: (g: SavingsGoal[]) => void; balance: number }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  function add() {
    const t = Number(target);
    if (!title.trim() || !t || t <= 0) return;
    setGoals([{ id: uid(), title: title.trim(), target: t, createdAt: new Date().toISOString() }, ...goals]);
    setTitle(""); setTarget("");
  }
  function remove(id: string) { setGoals(goals.filter((g) => g.id !== id)); }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Mục tiêu tiết kiệm</h3>
        <span className="ml-auto text-xs text-muted-foreground">Số dư: <span className="font-semibold text-foreground">{formatVND(balance)}</span></span>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <input placeholder="Tên mục tiêu (vd: Mua laptop)" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
        <input type="number" placeholder="Số tiền mục tiêu" value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={add} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]">
          <Plus className="h-4 w-4" /> Thêm
        </button>
      </div>
      {goals.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Chưa có mục tiêu nào.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => {
            const pct = Math.min(100, Math.max(0, (balance / g.target) * 100));
            return (
              <li key={g.id} className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{g.title}</div>
                    <div className="text-xs text-muted-foreground">{formatVND(Math.max(0, balance))} / {formatVND(g.target)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gradient-brand">{pct.toFixed(0)}%</span>
                    <button onClick={() => remove(g.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
