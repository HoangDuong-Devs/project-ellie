import { useEffect, useRef, type ReactNode } from "react";
import { Bold, Heading2, Italic, List, ListOrdered, Quote, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
};

type ToolbarButtonProps = {
  children: ReactNode;
  label: string;
  onClick: () => void;
};

function ToolbarButton({ children, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  readOnly,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (document.activeElement === element) return;
    if (element.innerHTML !== value) {
      element.innerHTML = value || "";
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (ref.current) {
      onChange(ref.current.innerHTML);
    }
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {!readOnly ? (
        <div className="mb-2 flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-card/60 p-1 backdrop-blur-sm">
          <ToolbarButton label="Bold" onClick={() => exec("bold")}>
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => exec("italic")}>
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Underline" onClick={() => exec("underline")}>
            <Underline className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton label="Heading" onClick={() => exec("formatBlock", "<h2>")}>
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Quote" onClick={() => exec("formatBlock", "<blockquote>")}>
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="Ordered list" onClick={() => exec("insertOrderedList")}>
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      ) : null}
      <div
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none flex-1 overflow-y-auto rounded-lg px-1 py-2 focus:outline-none",
          "[&[data-placeholder]:empty:before]:pointer-events-none [&[data-placeholder]:empty:before]:text-muted-foreground/60 [&[data-placeholder]:empty:before]:content-[attr(data-placeholder)]",
        )}
      />
    </div>
  );
}
