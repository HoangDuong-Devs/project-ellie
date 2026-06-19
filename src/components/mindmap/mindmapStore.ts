import { useCallback, useEffect, useState } from "react";
import { uid } from "@/lib/format";
import type { MindMapDoc } from "@/types/mindmap";

const STORAGE_KEY = "ellie:mindmaps";
const LEGACY_KEY = "ellie:mindmap";
export const ROOT_ID = "root";

export function makeDoc(name = "Sơ đồ mới"): MindMapDoc {
  const now = Date.now();
  return {
    id: uid(),
    name,
    tags: [],
    nodes: [
      {
        id: ROOT_ID,
        position: { x: 0, y: 0 },
        data: { label: "Ý tưởng trung tâm", depth: 0 },
      },
    ],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
}

function loadInitial(): MindMapDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MindMapDoc[];
    // migrate from legacy single doc
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as Partial<MindMapDoc>;
      const doc: MindMapDoc = {
        id: old.id ?? uid(),
        name: old.name ?? "Sơ đồ tư duy",
        tags: [],
        nodes: old.nodes ?? makeDoc().nodes,
        edges: old.edges ?? [],
        createdAt: old.updatedAt ?? Date.now(),
        updatedAt: old.updatedAt ?? Date.now(),
      };
      return [doc];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function useMindMaps() {
  const [docs, setDocs] = useState<MindMapDoc[]>(loadInitial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch {
      /* ignore */
    }
  }, [docs]);

  const create = useCallback((name?: string) => {
    const d = makeDoc(name);
    setDocs((prev) => [d, ...prev]);
    return d;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<MindMapDoc> | ((d: MindMapDoc) => MindMapDoc)) => {
      setDocs((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          const next = typeof patch === "function" ? patch(d) : { ...d, ...patch };
          return { ...next, updatedAt: Date.now() };
        }),
      );
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const duplicate = useCallback((id: string) => {
    setDocs((prev) => {
      const src = prev.find((d) => d.id === id);
      if (!src) return prev;
      const copy: MindMapDoc = {
        ...src,
        id: uid(),
        name: `${src.name} (copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return [copy, ...prev];
    });
  }, []);

  return { docs, setDocs, create, update, remove, duplicate };
}
