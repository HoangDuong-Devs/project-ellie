import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import type { JournalEntry } from "@/types/journal";
import { JournalEntryDialog } from "@/components/journal/JournalEntryDialog";
import { PageHeader } from "@/components/PageHeader";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { uid } from "@/lib/format";

const JournalBook = lazy(() =>
  import("@/components/journal/JournalBook").then((module) => ({ default: module.JournalBook })),
);

export const Route = createFileRoute("/app/journal")({
  component: JournalPage,
});

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function JournalPage() {
  const [entries, setEntries] = useLocalStorage<JournalEntry[]>("ellie:journal-entries", []);
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const openNew = () => {
    const today = todayISO();
    const existingEntry = entries.find((entry) => entry.date === today);

    if (existingEntry) {
      setEditing(existingEntry);
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
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    setEditing(entry);
    setOpen(true);
  };

  const saveEntry = (entry: JournalEntry) => {
    setEntries((previous) => {
      const exists = previous.some((item) => item.id === entry.id);
      return exists
        ? previous.map((item) => (item.id === entry.id ? entry : item))
        : [...previous, entry];
    });
  };

  const deleteEntry = (id: string) => {
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
  };

  return (
    <div>
      <PageHeader
        title="Nhật ký"
        description="Cuốn sách của riêng bạn, lật từng trang để ghi lại từng ngày."
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
        onSave={saveEntry}
        onDelete={deleteEntry}
      />
    </div>
  );
}
