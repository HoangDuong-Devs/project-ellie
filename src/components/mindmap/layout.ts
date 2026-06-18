import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import type { MindNodeData } from "@/types/mindmap";

const NODE_W = 200;
const NODE_H = 56;

export function autoLayout(
  nodes: Node<MindNodeData>[],
  edges: Edge[],
): Node<MindNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const p = g.node(n.id);
    return {
      ...n,
      position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 },
    };
  });
}

/** Assign hues to root's direct children and propagate down. */
export function recolor(
  nodes: Node<MindNodeData>[],
  edges: Edge[],
  rootId: string,
): Node<MindNodeData>[] {
  const childrenOf = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
    childrenOf.get(e.source)!.push(e.target);
  });

  const hueById = new Map<string, number | undefined>();
  hueById.set(rootId, undefined);

  const rootChildren = childrenOf.get(rootId) ?? [];
  rootChildren.forEach((cid, idx) => {
    const hue = Math.round((360 / Math.max(rootChildren.length, 6)) * idx);
    hueById.set(cid, hue);
  });

  // BFS propagate
  const queue = [...rootChildren];
  while (queue.length) {
    const id = queue.shift()!;
    const hue = hueById.get(id);
    (childrenOf.get(id) ?? []).forEach((cid) => {
      hueById.set(cid, hue);
      queue.push(cid);
    });
  }

  return nodes.map((n) => ({
    ...n,
    data: { ...n.data, hue: hueById.get(n.id) },
  }));
}

export function depthMap(edges: Edge[], rootId: string): Map<string, number> {
  const childrenOf = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
    childrenOf.get(e.source)!.push(e.target);
  });
  const depths = new Map<string, number>();
  depths.set(rootId, 0);
  const queue: Array<[string, number]> = [[rootId, 0]];
  while (queue.length) {
    const [id, d] = queue.shift()!;
    (childrenOf.get(id) ?? []).forEach((cid) => {
      depths.set(cid, d + 1);
      queue.push([cid, d + 1]);
    });
  }
  return depths;
}

export function hueToColor(hue: number | undefined, depth: number): string {
  if (hue === undefined) return "hsl(265 80% 60%)"; // root: purple
  const sat = Math.max(55, 80 - depth * 5);
  const light = Math.min(70, 55 + depth * 3);
  return `hsl(${hue} ${sat}% ${light}%)`;
}
