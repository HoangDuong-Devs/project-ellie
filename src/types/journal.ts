export type JournalEntry = {
  id: string;
  title: string;
  /** HTML content from contentEditable */
  content: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  createdAt: number;
  updatedAt: number;
};
