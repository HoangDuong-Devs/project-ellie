import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { AssistantPanel } from "./AssistantPanel";
import { cn } from "@/lib/utils";

export function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Hide bubble on the dedicated assistant page itself
  if (pathname === "/app/assistant") return null;

  return (
    <>
      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-24 right-4 z-40 w-[min(380px,calc(100vw-2rem))] origin-bottom-right transition-all duration-200 lg:bottom-20 lg:right-6",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <AssistantPanel />
      </div>

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở trợ lý Ellie"
        className={cn(
          "fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow transition-transform hover:scale-110 lg:bottom-6 lg:right-6",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
        )}
      </button>
    </>
  );
}
