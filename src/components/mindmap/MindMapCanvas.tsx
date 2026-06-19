import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { LayoutGrid, Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/format";
import { MindNode } from "./MindNode";
import { autoLayout, recolor, depthMap, hueToColor } from "./layout";
import { useMindMaps, ROOT_ID } from "./mindmapStore";
import type { MindMapDoc, MindNodeData } from "@/types/mindmap";

const nodeTypes = { mind: MindNode } as const;

function Inner({ docId }: { docId: string }) {
  const { docs, update } = useMindMaps();
  const doc = docs.find((d) => d.id === docId);

  // Local React Flow state, hydrated from doc once.
  const [nodes, setNodes] = useState<Node<MindNodeData>[]>(() =>
    doc ? hydrate(doc).nodes : [],
  );
  const [edges, setEdges] = useState<Edge[]>(() => (doc ? hydrate(doc).edges : []));
  const [editingId, setEditingId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rf = useReactFlow();

  // Persist on change
  useEffect(() => {
    if (!doc) return;
    const cleanNodes = nodes.map((n) => ({
      id: n.id,
      position: n.position,
      data: { label: n.data.label, hue: n.data.hue, depth: n.data.depth },
    }));
    const cleanEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));
    update(docId, { nodes: cleanNodes, edges: cleanEdges });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const selectedId = useMemo(() => nodes.find((n) => n.selected)?.id, [nodes]);

  const rebuildWithMeta = useCallback(
    (next: { nodes: Node<MindNodeData>[]; edges: Edge[] }) => {
      const depths = depthMap(next.edges, ROOT_ID);
      const colored = recolor(
        next.nodes.map((n) => ({
          ...n,
          data: { ...n.data, depth: depths.get(n.id) ?? 0 },
        })),
        next.edges,
        ROOT_ID,
      );
      return { nodes: colored, edges: next.edges };
    },
    [],
  );

  const addChild = useCallback(
    (parentId: string) => {
      const parent = nodes.find((n) => n.id === parentId);
      if (!parent) return;
      const id = uid();
      const newNode: Node<MindNodeData> = {
        id,
        type: "mind",
        position: {
          x: parent.position.x + 240,
          y: parent.position.y + (Math.random() - 0.5) * 80,
        },
        data: { label: "Ý mới", depth: (parent.data.depth ?? 0) + 1 },
      };
      const newEdge: Edge = {
        id: `e-${parentId}-${id}`,
        source: parentId,
        target: id,
      };
      const next = rebuildWithMeta({
        nodes: [...nodes, newNode],
        edges: [...edges, newEdge],
      });
      setNodes(next.nodes.map((n) => ({ ...n, selected: n.id === id })));
      setEdges(next.edges);
      setEditingId(id);
    },
    [nodes, edges, rebuildWithMeta],
  );

  const addSibling = useCallback(
    (id: string) => {
      const parentEdge = edges.find((e) => e.target === id);
      if (!parentEdge) return;
      addChild(parentEdge.source);
    },
    [edges, addChild],
  );

  const deleteNode = useCallback(
    (id: string) => {
      if (id === ROOT_ID) return;
      const toRemove = new Set<string>([id]);
      let added = true;
      while (added) {
        added = false;
        edges.forEach((e) => {
          if (toRemove.has(e.source) && !toRemove.has(e.target)) {
            toRemove.add(e.target);
            added = true;
          }
        });
      }
      const next = rebuildWithMeta({
        nodes: nodes.filter((n) => !toRemove.has(n.id)),
        edges: edges.filter(
          (e) => !toRemove.has(e.source) && !toRemove.has(e.target),
        ),
      });
      setNodes(next.nodes);
      setEdges(next.edges);
    },
    [nodes, edges, rebuildWithMeta],
  );

  const renameNode = useCallback((id: string, label: string) => {
    setNodes((cur) =>
      cur.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
    );
  }, []);

  const decoratedNodes = useMemo<Node<MindNodeData>[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        type: "mind",
        data: {
          ...n.data,
          isRoot: n.id === ROOT_ID,
          editing: editingId === n.id,
          onAddChild: addChild,
          onDelete: deleteNode,
          onRename: renameNode,
          onEditDone: (eid: string) =>
            setEditingId((cur) => (cur === eid ? null : cur)),
        } as MindNodeData,
      })),
    [nodes, editingId, addChild, deleteNode, renameNode],
  );

  const decoratedEdges = useMemo<Edge[]>(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return edges.map((e) => {
      const target = nodeMap.get(e.target);
      const color = hueToColor(target?.data.hue, target?.data.depth ?? 0);
      return {
        ...e,
        type: "default",
        animated: false,
        style: { stroke: color, strokeWidth: 2.5 },
      };
    });
  }, [nodes, edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<MindNodeData>[]),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => {
        const next = addEdge({ ...params, id: `e-${params.source}-${params.target}` }, eds);
        return rebuildWithMeta({ nodes, edges: next }).edges;
      }),
    [nodes, rebuildWithMeta],
  );

  const onNodeDragStop: OnNodeDrag<Node<MindNodeData>> = useCallback(
    (_evt, draggedNode) => {
      if (draggedNode.id === ROOT_ID) return;
      const target = nodes.find((n) => {
        if (n.id === draggedNode.id) return false;
        const dx = (n.position.x + 100) - (draggedNode.position.x + 100);
        const dy = (n.position.y + 28) - (draggedNode.position.y + 28);
        return Math.sqrt(dx * dx + dy * dy) < 90;
      });
      if (!target) return;
      const descendants = new Set<string>([draggedNode.id]);
      let grew = true;
      while (grew) {
        grew = false;
        edges.forEach((e) => {
          if (descendants.has(e.source) && !descendants.has(e.target)) {
            descendants.add(e.target);
            grew = true;
          }
        });
      }
      if (descendants.has(target.id)) return;

      const nextEdges = edges
        .filter((e) => e.target !== draggedNode.id)
        .concat({
          id: `e-${target.id}-${draggedNode.id}`,
          source: target.id,
          target: draggedNode.id,
        });
      const next = rebuildWithMeta({ nodes, edges: nextEdges });
      setNodes(next.nodes);
      setEdges(next.edges);
    },
    [nodes, edges, rebuildWithMeta],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!selectedId) return;
      if (e.key === "Tab") {
        e.preventDefault();
        addChild(selectedId);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedId === ROOT_ID) addChild(selectedId);
        else addSibling(selectedId);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId !== ROOT_ID) {
          e.preventDefault();
          deleteNode(selectedId);
        }
      } else if (e.key === "F2") {
        e.preventDefault();
        setEditingId(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, addChild, addSibling, deleteNode]);

  const runAutoLayout = useCallback(() => {
    const laid = autoLayout(nodes, edges);
    setNodes(laid);
    requestAnimationFrame(() => rf.fitView({ duration: 400, padding: 0.2 }));
  }, [nodes, edges, rf]);

  const exportPng = useCallback(async () => {
    const host = wrapperRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!host) return;
    try {
      const dataUrl = await toPng(host, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        filter: (node) => {
          const cls = (node as HTMLElement).className?.toString?.() ?? "";
          return !/react-flow__(controls|minimap|attribution|panel)/.test(cls);
        },
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.download = `${doc?.name ?? "mindmap"}-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch {
      /* ignore */
    }
  }, [doc?.name]);

  if (!doc) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center text-muted-foreground">
        Không tìm thấy sơ đồ.
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative h-[calc(100vh-12rem)] w-full overflow-hidden rounded-2xl border border-border bg-card/40"
    >
      <ReactFlow
        nodes={decoratedNodes}
        edges={decoratedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        fitView
        defaultEdgeOptions={{ type: "default" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.4} />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-background/70 !rounded-xl" />
      </ReactFlow>

      <div className="pointer-events-auto absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border bg-background/80 p-1.5 shadow-lg backdrop-blur-xl">
        <Button variant="ghost" size="sm" onClick={() => addChild(selectedId ?? ROOT_ID)} title="Thêm nhánh (Tab)">
          <Plus className="h-4 w-4" /> Nhánh
        </Button>
        <Button variant="ghost" size="sm" onClick={runAutoLayout} title="Tự sắp xếp">
          <LayoutGrid className="h-4 w-4" /> Auto layout
        </Button>
        <Button variant="ghost" size="sm" onClick={exportPng} title="Xuất PNG">
          <Download className="h-4 w-4" /> Export
        </Button>
        {selectedId && selectedId !== ROOT_ID && (
          <>
            <div className="mx-1 h-5 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteNode(selectedId)}
              className="text-destructive hover:text-destructive"
              title="Xóa nhánh (Delete)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Tab</kbd> nhánh con ·{" "}
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Enter</kbd> ngang hàng ·{" "}
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Del</kbd> xóa ·{" "}
        Double-click để sửa
      </div>
    </div>
  );
}

function hydrate(doc: MindMapDoc): { nodes: Node<MindNodeData>[]; edges: Edge[] } {
  const nodes: Node<MindNodeData>[] = doc.nodes.map((n) => ({
    id: n.id,
    type: "mind",
    position: n.position,
    data: { ...n.data },
  }));
  const edges: Edge[] = doc.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "default",
  }));
  const depths = depthMap(edges, ROOT_ID);
  const colored = recolor(
    nodes.map((n) => ({
      ...n,
      data: { ...n.data, depth: depths.get(n.id) ?? 0 },
    })),
    edges,
    ROOT_ID,
  );
  return { nodes: colored, edges };
}

export function MindMapCanvas({ docId }: { docId: string }) {
  return (
    <ReactFlowProvider>
      <Inner key={docId} docId={docId} />
    </ReactFlowProvider>
  );
}
