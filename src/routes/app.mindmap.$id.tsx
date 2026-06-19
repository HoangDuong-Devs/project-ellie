import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ChevronLeft, Network } from "lucide-react";
import { useMindMaps } from "@/components/mindmap/mindmapStore";

const MindMapCanvas = lazy(() =>
  import("@/components/mindmap/MindMapCanvas").then((m) => ({
    default: m.MindMapCanvas,
  })),
);

export const Route = createFileRoute("/app/mindmap/$id")({
  component: MindMapDetailPage,
});

function MindMapDetailPage() {
  const { id } = Route.useParams();
  const { docs } = useMindMaps();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const doc = docs.find((d) => d.id === id);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/app/mindmap"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{doc?.name ?? "Sơ đồ"}</h1>
          {doc && doc.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {doc.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {mounted ? (
        <Suspense
          fallback={
            <div className="flex h-[calc(100vh-12rem)] items-center justify-center text-muted-foreground">
              <Network className="mr-2 h-5 w-5 animate-pulse" /> Đang tải canvas...
            </div>
          }
        >
          <MindMapCanvas docId={id} />
        </Suspense>
      ) : (
        <div className="flex h-[calc(100vh-12rem)] items-center justify-center text-muted-foreground">
          <Network className="mr-2 h-5 w-5 animate-pulse" /> Đang tải canvas...
        </div>
      )}
    </div>
  );
}
