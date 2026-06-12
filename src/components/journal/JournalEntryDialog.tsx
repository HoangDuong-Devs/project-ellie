import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "./RichTextEditor";
import type { JournalEntry } from "@/types/journal";
import { Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: JournalEntry | null;
  onSave: (e: JournalEntry) => void;
  onDelete?: (id: string) => void;
};

export function JournalEntryDialog({ open, onOpenChange, entry, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!entry) return;
    setTitle(entry.title);
    setDate(entry.date);
    setContent(entry.content);
  }, [entry, open]);

  if (!entry) return null;

  const save = () => {
    onSave({
      ...entry,
      title: title.trim(),
      date,
      content,
      updatedAt: Date.now(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Trang nhật ký</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <Label className="text-xs">Tiêu đề</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Một ngày đẹp trời..."
                className="font-serif text-base"
              />
            </div>
            <div>
              <Label className="text-xs">Ngày</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex min-h-[300px] flex-1 flex-col">
            <Label className="mb-1 text-xs">Nội dung</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Hôm nay mình..."
              className="flex-1"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            {onDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Xóa entry này?")) {
                    onDelete(entry.id);
                    onOpenChange(false);
                  }
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1 h-4 w-4" /> Xóa
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button onClick={save}>Lưu</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
