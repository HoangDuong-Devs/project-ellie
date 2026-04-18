export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  note?: string;
  color?: string; // tailwind color name
}

export interface SavingsGoal {
  id: string;
  title: string;
  target: number;
  createdAt: string;
}
