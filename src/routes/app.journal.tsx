import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { uid } from "@/lib/format";
import type { JournalEntry } from "@/types/journal";
import { JournalEntryDialog } from "@/components/journal/JournalEntryDialog";
import { BookOpen } from "lucide-react";

const JournalBook = lazy(() =>
  import("@/components/journal/JournalBook").then((m) => ({ default: m.JournalBook })),
);

export const Route = createFileRoute("/app/journal")({
  component: JournalPage,
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function JournalPage() {
  const [entries, setEntries] = useLocalStorage<JournalEntry[]>("ellie:journal-entries", []);
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const openNew = () => {
    const today = todayISO();
    const existing = entries.find((e) => e.date === today);
    if (existing) {
      setEditing(existing);
    } else {
      setEditing({
        id: uid(),
        title: "",
        content: "",
        date: today,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    setOpen(true);
  };

  const openEntry = (id: string) => {
    const e = entries.find((x) => x.id === id);
    if (e) {
      setEditing(e);
      setOpen(true);
    }
  };

  const save = (e: JournalEntry) => {
    setEntries((prev) => {
      const exists = prev.some((x) => x.id === e.id);
      return exists ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e];
    });
  };

  const del = (id: string) => {
    setEntries((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div>
      <PageHeader
        title="Nhật ký"
        description="Cuốn sách của riêng bạn — lật từng trang, ghi lại từng ngày."
      />

      <div className="rounded-3xl bg-gradient-to-b from-amber-50/50 via-background to-background p-4 pb-12 dark:from-amber-950/10">
        {mounted ? (
          <Suspense
            fallback={
              <div className="flex h-[600px] items-center justify-center text-muted-foreground">
                <BookOpen className="mr-2 h-5 w-5 animate-pulse" /> Đang mở sách...
              </div>
            }
          >
            <JournalBook entries={entries} onOpenEntry={openEntry} onNewEntry={openNew} />
          </Suspense>
        ) : (
          <div className="flex h-[600px] items-center justify-center text-muted-foreground">
            <BookOpen className="mr-2 h-5 w-5 animate-pulse" /> Đang mở sách...
          </div>
        )}
      </div>

      <JournalEntryDialog
        open={open}
        onOpenChange={setOpen}
        entry={editing}
        onSave={save}
        onDelete={del}
      />
    </div>
  );
}
