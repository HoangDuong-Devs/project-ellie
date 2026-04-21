import { uid } from "@/lib/format";
import {
  DEFAULT_COLUMN_NAMES,
  type LabelColor,
  type Workspace,
  type WorkColumn,
  type WorkData,
  type WorkLabel,
} from "@/types/work";

export const WORK_STORAGE_KEY = "ellie:work:v1";

export function makeDefaultWorkData(): WorkData {
  const wsId = uid();
  const now = new Date().toISOString();
  const columns: WorkColumn[] = DEFAULT_COLUMN_NAMES.map((name, i) => ({
    id: uid(),
    workspaceId: wsId,
    name,
    order: i,
  }));

  const labels: WorkLabel[] = [
    { id: uid(), name: "Frontend", color: "blue" },
    { id: uid(), name: "Bug", color: "red" },
    { id: uid(), name: "Idea", color: "purple" },
  ];

  const ws: Workspace = {
    id: wsId,
    name: "Workspace của tôi",
    description: "Workspace mặc định",
    icon: "🚀",
    color: "pink",
    useSprints: false,
    createdAt: now,
  };

  return { workspaces: [ws], columns, cards: [], labels, sprints: [] };
}

export function ensureWorkData(data: WorkData): WorkData {
  if (!data.workspaces || data.workspaces.length === 0) {
    return makeDefaultWorkData();
  }
  return data;
}

export type CreateWorkspaceInput = {
  name: string;
  icon?: string;
  color?: LabelColor;
  useSprints?: boolean;
  description?: string;
};

export function createWorkspaceWithDefaults(input: CreateWorkspaceInput) {
  const id = uid();
  const now = new Date().toISOString();

  const workspace: Workspace = {
    id,
    name: input.name,
    description: input.description,
    icon: input.icon ?? "📁",
    color: input.color ?? "pink",
    useSprints: input.useSprints ?? false,
    createdAt: now,
  };

  const columns: WorkColumn[] = DEFAULT_COLUMN_NAMES.map((name, i) => ({
    id: uid(),
    workspaceId: id,
    name,
    order: i,
  }));

  return { workspace, columns };
}
