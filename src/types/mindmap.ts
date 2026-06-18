export interface MindNodeData {
  label: string;
  /** color hue (0-360); root = undefined, branches inherit from their root child */
  hue?: number;
  /** depth from root (0 = root) */
  depth: number;
  [key: string]: unknown;
}

export interface MindMapDoc {
  id: string;
  name: string;
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: MindNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
  updatedAt: number;
}
