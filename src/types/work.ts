export type WorkPriority = "highest" | "high" | "medium" | "low" | "lowest";

export type IssueType = "task" | "story" | "bug";

export type LabelColor =
  | "pink" | "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "gray";

export interface WorkLabel {
  id: string;
  name: string;
  color: LabelColor;
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export type CardStatus = "backlog" | "active";

export interface WorkCard {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  columnId: string;            // current column on the board
  status: CardStatus;          // backlog = chưa kéo lên board (chỉ dùng khi sprint mode tắt cũng OK)
  priority: WorkPriority;
  type: IssueType;
  labelIds: string[];
  subtasks: SubTask[];
  dueDate?: string;            // ISO date
  storyPoints?: number;        // chỉ hiển thị khi workspace.useSprints
  sprintId?: string | null;    // null = backlog
  assignee?: string;           // tên text tự nhập (offline, không có user thật)
  order: number;               // sort within column / backlog
  createdAt: string;
  updatedAt: string;
}

export interface WorkColumn {
  id: string;
  workspaceId: string;
  name: string;
  order: number;
}

export type SprintState = "planned" | "active" | "completed";

export interface Sprint {
  id: string;
  workspaceId: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  state: SprintState;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;            // emoji
  color: LabelColor;
  useSprints: boolean;      // bật/tắt chế độ Scrum
  createdAt: string;
}

export interface WorkData {
  workspaces: Workspace[];
  columns: WorkColumn[];
  cards: WorkCard[];
  labels: WorkLabel[];
  sprints: Sprint[];
}

export const PRIORITY_LABELS: Record<WorkPriority, string> = {
  highest: "Cao nhất",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
  lowest: "Thấp nhất",
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  task: "Task",
  story: "Story",
  bug: "Bug",
};

export const LABEL_COLORS: Record<LabelColor, { dot: string; chip: string }> = {
  pink:   { dot: "bg-pink-500",    chip: "bg-pink-100 text-pink-800 border-pink-200" },
  red:    { dot: "bg-rose-500",    chip: "bg-rose-100 text-rose-800 border-rose-200" },
  orange: { dot: "bg-orange-500",  chip: "bg-orange-100 text-orange-800 border-orange-200" },
  yellow: { dot: "bg-amber-500",   chip: "bg-amber-100 text-amber-900 border-amber-200" },
  green:  { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cyan:   { dot: "bg-cyan-500",    chip: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  blue:   { dot: "bg-blue-500",    chip: "bg-blue-100 text-blue-800 border-blue-200" },
  purple: { dot: "bg-violet-500",  chip: "bg-violet-100 text-violet-800 border-violet-200" },
  gray:   { dot: "bg-slate-500",   chip: "bg-slate-100 text-slate-800 border-slate-200" },
};

export const DEFAULT_COLUMN_NAMES = ["To Do", "In Progress", "Done"] as const;
