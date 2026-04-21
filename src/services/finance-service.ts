import { uid } from "@/lib/format";
import type { SavingsGoal } from "@/types/calendar";
import type { Transaction, TxType } from "@/types/finance";

export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
};

export type MonthlyBudget = {
  total: number;
  categories: Record<string, number>;
};

export type MonthlyBudgetStore = Record<string, MonthlyBudget>;

export const DEFAULT_MONTHLY_BUDGET: MonthlyBudget = {
  total: 0,
  categories: {},
};

export function getMonthBudgetKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function listTransactionsForMonth(transactions: Transaction[], year: number, month: number) {
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function monthlySummary(transactions: Transaction[], year: number, month: number): MonthSummary {
  const monthTx = listTransactionsForMonth(transactions, year, month);
  const income = monthTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  return {
    income,
    expense,
    balance: income - expense,
  };
}

export function totalBalance(transactions: Transaction[]) {
  return transactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
}

export function addTransaction(
  transactions: Transaction[],
  input: { type: TxType; amount: number; category: string; note?: string; date: string },
): Transaction[] {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return transactions;

  return [
    {
      id: uid(),
      type: input.type,
      amount,
      category: input.category,
      note: input.note?.trim() || undefined,
      date: new Date(input.date).toISOString(),
    },
    ...transactions,
  ];
}

export function removeTransaction(transactions: Transaction[], id: string): Transaction[] {
  return transactions.filter((t) => t.id !== id);
}

export function updateTransaction(
  transactions: Transaction[],
  id: string,
  patch: Partial<Omit<Transaction, "id">>,
): Transaction[] {
  return transactions.map((tx) => {
    if (tx.id !== id) return tx;
    return {
      ...tx,
      ...patch,
      note: patch.note != null ? patch.note.trim() || undefined : tx.note,
      amount:
        patch.amount != null && Number.isFinite(Number(patch.amount)) ? Number(patch.amount) : tx.amount,
      date: patch.date != null ? new Date(patch.date).toISOString() : tx.date,
    };
  });
}

export function addSavingsGoal(goals: SavingsGoal[], input: { title: string; target: number }): SavingsGoal[] {
  const target = Number(input.target);
  if (!input.title.trim() || !Number.isFinite(target) || target <= 0) return goals;

  return [
    {
      id: uid(),
      title: input.title.trim(),
      target,
      createdAt: new Date().toISOString(),
    },
    ...goals,
  ];
}

export function removeSavingsGoal(goals: SavingsGoal[], id: string): SavingsGoal[] {
  return goals.filter((g) => g.id !== id);
}
