import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Network } from "lucide-react";

const MindMapCanvas = lazy(() =>
  import("@/components/mindmap/MindMapCanvas").then((m) => ({
    default: m.MindMapCanvas,
  })),
);

export const Route = createFileRoute("/app/mindmap")({
  component: MindMapPage,
});

function MindMapPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div>
      <PageHeader
        title="Mind Map"
        description="Sơ đồ tư duy kéo thả — phác ý tưởng, nối nhánh, sắp xếp tự động."
      />
      {mounted ? (
        <Suspense
          fallback={
            <div className="flex h-[600px] items-center justify-center text-muted-foreground">
              <Network className="mr-2 h-5 w-5 animate-pulse" /> Đang tải canvas...
            </div>
          }
        >
          <MindMapCanvas />
        </Suspense>
      ) : (
        <div className="flex h-[600px] items-center justify-center text-muted-foreground">
          <Network className="mr-2 h-5 w-5 animate-pulse" /> Đang tải canvas...
        </div>
      )}
    </div>
  );
}
