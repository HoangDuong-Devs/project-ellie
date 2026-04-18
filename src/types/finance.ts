export type TxType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note?: string;
  date: string; // ISO
}

export const INCOME_CATEGORIES = ["Lương", "Thưởng", "Đầu tư", "Khác"];
export const EXPENSE_CATEGORIES = [
  "Ăn uống",
  "Đi lại",
  "Mua sắm",
  "Hóa đơn",
  "Giải trí",
  "Sức khỏe",
  "Học tập",
  "Khác",
];
