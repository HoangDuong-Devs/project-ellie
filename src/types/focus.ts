export interface PomodoroSession {
  id: string;
  date: string; // ISO
  minutes: number;
}

export interface FocusSettings {
  workMinutes: number;
  breakMinutes: number;
}
