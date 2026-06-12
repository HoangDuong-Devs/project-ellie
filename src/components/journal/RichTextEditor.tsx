import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Quote, Heading2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
};

export function RichTextEditor({ value, onChange, placeholder, readOnly, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Only sync external value when the editor is unfocused or content differs
  // and we're in read-only mode. Avoid clobbering the caret during typing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const Btn = ({
    onClick,
    children,
    label,
  }: {
    onClick: () => void;
    children: React.ReactNode;
    label: string;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {!readOnly && (
        <div className="mb-2 flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-card/60 p-1 backdrop-blur-sm">
          <Btn label="Bold" onClick={() => exec("bold")}>
            <Bold className="h-3.5 w-3.5" />
          </Btn>
          <Btn label="Italic" onClick={() => exec("italic")}>
            <Italic className="h-3.5 w-3.5" />
          </Btn>
          <Btn label="Underline" onClick={() => exec("underline")}>
            <Underline className="h-3.5 w-3.5" />
          </Btn>
          <div className="mx-1 h-4 w-px bg-border" />
          <Btn label="Heading" onClick={() => exec("formatBlock", "<h2>")}>
            <Heading2 className="h-3.5 w-3.5" />
          </Btn>
          <Btn label="Quote" onClick={() => exec("formatBlock", "<blockquote>")}>
            <Quote className="h-3.5 w-3.5" />
          </Btn>
          <Btn label="Bullet list" onClick={() => exec("insertUnorderedList")}>
            <List className="h-3.5 w-3.5" />
          </Btn>
          <Btn label="Ordered list" onClick={() => exec("insertOrderedList")}>
            <ListOrdered className="h-3.5 w-3.5" />
          </Btn>
        </div>
      )}
      <div
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none flex-1 overflow-y-auto rounded-lg px-1 py-2 focus:outline-none",
          "[&[data-placeholder]:empty:before]:pointer-events-none [&[data-placeholder]:empty:before]:text-muted-foreground/60 [&[data-placeholder]:empty:before]:content-[attr(data-placeholder)]",
        )}
      />
    </div>
  );
}
