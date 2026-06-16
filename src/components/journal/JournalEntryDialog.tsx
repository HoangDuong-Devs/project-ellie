import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import type { JournalEntry } from "@/types/journal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/journal/RichTextEditor";

type JournalEntryDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  entry: JournalEntry | null;
  onSave: (entry: JournalEntry) => void;
  onDelete?: (id: string) => void;
};

export function JournalEntryDialog({
  open,
  onOpenChange,
  entry,
  onSave,
  onDelete,
}: JournalEntryDialogProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!entry) return;
    setTitle(entry.title);
    setDate(entry.date);
    setContent(entry.content);
  }, [entry, open]);

  if (!entry) {
    return null;
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onSave({
      ...entry,
      title: newTitle,
      date,
      content,
      updatedAt: Date.now(),
    });
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    onSave({
      ...entry,
      title,
      date: newDate,
      content,
      updatedAt: Date.now(),
    });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onSave({
      ...entry,
      title,
      date,
      content: newContent,
      updatedAt: Date.now(),
    });
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
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="Một ngày đẹp trời..."
                className="font-serif text-base"
              />
            </div>
            <div>
              <Label className="text-xs">Ngày</Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => handleDateChange(event.target.value)}
              />
            </div>
          </div>
          <div className="flex min-h-[300px] flex-1 flex-col">
            <Label className="mb-1 text-xs">Nội dung</Label>
            <RichTextEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Hôm nay mình..."
              className="flex-1"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              {onDelete && (
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
              )}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Đã lưu tự động
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onOpenChange(false)}>Đóng</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
