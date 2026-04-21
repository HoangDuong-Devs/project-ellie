import type { SavingsGoal } from "@/types/calendar";
import type { MonthlyBudget } from "@/services/finance-service";
import type { Transaction, TxType } from "@/types/finance";
import { emitDataChanged } from "@/services/api-live-sync";

type TransactionsResponse = { transactions: Transaction[] };
type FinanceSummaryResponse = {
  year: number;
  month: number;
  summary: {
    income: number;
    expense: number;
    balance: number;
  };
  monthTransactions: Transaction[];
  totalBalance: number;
};

type SavingsGoalsResponse = { goals: SavingsGoal[] };
type MonthlyBudgetResponse = {
  year: number;
  month: number;
  key: string;
  budget: MonthlyBudget;
};

type CreateSavingsGoalInput = {
  title: string;
  target: number;
};

type CreateTransactionInput = {
  type: TxType;
  amount: number;
  category: string;
  note?: string;
  date: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || `Request failed: ${res.status}`);
  }
  return body as T;
}

export function listTransactions() {
  return request<TransactionsResponse>("/api/finance/transactions");
}

export function createTransaction(input: CreateTransactionInput) {
  return request<TransactionsResponse>("/api/finance/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((res) => {
    emitDataChanged("finance");
    return res;
  });
}

export function patchTransaction(id: string, patch: Partial<Omit<Transaction, "id">>) {
  return request<TransactionsResponse>("/api/finance/transactions", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("finance");
    return res;
  });
}

export function deleteTransaction(id: string) {
  return request<TransactionsResponse>("/api/finance/transactions", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("finance");
    return res;
  });
}

export function getFinanceSummary(year?: number, month?: number) {
  const query = new URLSearchParams();
  if (typeof year === "number") query.set("year", String(year));
  if (typeof month === "number") query.set("month", String(month));
  const suffix = query.toString();
  return request<FinanceSummaryResponse>(`/api/finance/summary${suffix ? `?${suffix}` : ""}`);
}

export function listSavingsGoals() {
  return request<SavingsGoalsResponse>("/api/finance/savings-goals");
}

export function createSavingsGoal(input: CreateSavingsGoalInput) {
  return request<SavingsGoalsResponse>("/api/finance/savings-goals", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((res) => {
    emitDataChanged("finance");
    return res;
  });
}

export function patchSavingsGoal(id: string, patch: Partial<Pick<SavingsGoal, "title" | "target">>) {
  return request<SavingsGoalsResponse>("/api/finance/savings-goals", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("finance");
    return res;
  });
}

export function deleteSavingsGoal(id: string) {
  return request<SavingsGoalsResponse>("/api/finance/savings-goals", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("finance");
    return res;
  });
}

export function getMonthlyBudget(year: number, month: number) {
  const query = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return request<MonthlyBudgetResponse>(`/api/finance/monthly-budget?${query.toString()}`);
}

export function setMonthlyBudget(year: number, month: number, budget: MonthlyBudget) {
  return request<MonthlyBudgetResponse>("/api/finance/monthly-budget", {
    method: "POST",
    body: JSON.stringify({ year, month, budget }),
  }).then((res) => {
    emitDataChanged("finance");
    return res;
  });
}
