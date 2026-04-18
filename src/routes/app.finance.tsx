import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatVND, uid } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Transaction,
  type TxType,
} from "@/types/finance";

export const Route = createFileRoute("/app/finance")({
  head: () => ({ meta: [{ title: "Tài chính — ProjectEllie" }] }),
  component: Finance,
});

const CHART_COLORS = ["#ec4899", "#06b6d4", "#a855f7", "#f43f5e", "#22d3ee", "#f97316", "#10b981"];

function Finance() {
  const [tx, setTx] = useLocalStorage<Transaction[]>("ellie:transactions", []);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const summary = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const monthTx = tx.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [tx]);

  const monthlyData = useMemo(() => {
    const months: { name: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `T${d.getMonth() + 1}`;
      const inc = tx
        .filter((t) => {
          const td = new Date(t.date);
          return (
            td.getMonth() === d.getMonth() &&
            td.getFullYear() === d.getFullYear() &&
            t.type === "income"
          );
        })
        .reduce((s, t) => s + t.amount, 0);
      const exp = tx
        .filter((t) => {
          const td = new Date(t.date);
          return (
            td.getMonth() === d.getMonth() &&
            td.getFullYear() === d.getFullYear() &&
            t.type === "expense"
          );
        })
        .reduce((s, t) => s + t.amount, 0);
      months.push({ name: label, income: inc, expense: exp });
    }
    return months;
  }, [tx]);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    tx.filter((t) => {
      const d = new Date(t.date);
      return (
        t.type === "expense" &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).forEach((t) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [tx]);

  function add() {
    const a = Number(amount);
    if (!a || a <= 0) return;
    setTx([
      {
        id: uid(),
        type,
        amount: a,
        category,
        note: note.trim() || undefined,
        date: new Date(date).toISOString(),
      },
      ...tx,
    ]);
    setAmount("");
    setNote("");
  }

  function remove(id: string) {
    setTx(tx.filter((t) => t.id !== id));
  }

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div>
      <PageHeader title="Tài chính" description="Theo dõi thu chi & phân tích chi tiêu của bạn." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Thu" value={summary.income} icon={TrendingUp} positive />
        <StatCard label="Chi" value={summary.expense} icon={TrendingDown} />
        <StatCard label="Số dư" value={summary.balance} icon={Wallet} positive={summary.balance >= 0} />
      </div>

      {/* Add form */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-4 font-semibold">Thêm giao dịch</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <select
            value={type}
            onChange={(e) => {
              const v = e.target.value as TxType;
              setType(v);
              setCategory(v === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
            }}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="expense">Chi</option>
            <option value="income">Thu</option>
          </select>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Số tiền"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="Ghi chú (tuỳ chọn)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm sm:col-span-2 lg:col-span-1"
          />
          <button
            onClick={add}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> Thêm
          </button>
        </div>
      </section>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-4 font-semibold">Thu vs Chi (6 tháng)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={11} tickFormatter={(v) => `${v / 1_000_000}M`} />
                <Tooltip
                  formatter={(v: number) => formatVND(v)}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                />
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
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu chi tháng này
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatVND(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-4 font-semibold">Giao dịch gần đây</h3>
        {tx.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tx.slice(0, 30).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    t.type === "income" ? "bg-cyan-500/15 text-cyan-500" : "bg-pink-500/15 text-pink-500"
                  }`}
                >
                  {t.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{t.category}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("vi-VN")}
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>
                <div className={`text-sm font-semibold ${t.type === "income" ? "text-cyan-500" : "text-pink-500"}`}>
                  {t.type === "income" ? "+" : "-"}
                  {formatVND(t.amount)}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  positive = false,
}: {
  label: string;
  value: number;
  icon: typeof Wallet;
  positive?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            positive ? "bg-cyan-500/15 text-cyan-500" : "bg-pink-500/15 text-pink-500"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold">{formatVND(value)}</div>
    </div>
  );
}
