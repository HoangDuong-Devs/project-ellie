import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  useAssistantInsights,
  ASSISTANT_COMMANDS,
  type AssistantCommand,
} from "@/hooks/useAssistantInsights";
import { uid } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: string;
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  ts: new Date().toISOString(),
  content: [
    "Xin chào! Mình là **Ellie Assistant** ✨",
    "",
    "Mình có thể tóm tắt nhanh dữ liệu của bạn. Thử các lệnh:",
    "",
    "- `/tongquan` — tổng hợp mọi thứ",
    "- `/baocao-ngay` — chi tiêu hôm nay",
    "- `/ngansach` — tình hình ngân sách",
    "- `/lich-homnay` — sự kiện hôm nay",
    "- `/muctieu` — tiến độ mục tiêu",
    "- `/focus` — pomodoro & streak",
  ].join("\n"),
};

function findCommand(text: string): AssistantCommand | null {
  const t = text.trim().toLowerCase();
  if (!t.startsWith("/")) return null;
  const name = t.split(/\s+/)[0];
  return ASSISTANT_COMMANDS.find((c) => c.label === name) ?? null;
}

function fallbackReply(text: string): string {
  const t = text.toLowerCase();
  if (/(chi(\s|$)|tiêu|ngân sách|budget|tiền)/.test(t))
    return "Mình có thể giúp với chi tiêu! Thử `/baocao-ngay` hoặc `/ngansach` nhé.";
  if (/(lịch|sự kiện|hẹn|meeting|event)/.test(t))
    return "Bạn muốn xem lịch? Gõ `/lich-homnay` để mình tóm tắt.";
  if (/(mục tiêu|goal|tiến độ)/.test(t)) return "Gõ `/muctieu` để xem tiến độ các mục tiêu nhé.";
  if (/(focus|pomodoro|tập trung|streak)/.test(t))
    return "Thử `/focus` để xem thống kê tập trung gần đây.";
  if (/(hello|hi|chào|hey)/i.test(t)) return "Chào bạn! 👋 Bắt đầu với `/tongquan` nhé.";
  return [
    "Hiện mình mới hỗ trợ các lệnh báo cáo. Gõ `/` để xem danh sách:",
    "",
    ASSISTANT_COMMANDS.map((c) => `- \`${c.label}\` — ${c.description}`).join("\n"),
  ].join("\n");
}

export function AssistantPanel({
  className,
  variant = "embedded",
}: {
  className?: string;
  variant?: "embedded" | "page";
}) {
  const insights = useAssistantInsights();
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>("ellie:assistant-chat", [WELCOME]);
  const [input, setInput] = useState("");
  const [showSlash, setShowSlash] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const filteredCommands = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q.startsWith("/")) return [];
    return ASSISTANT_COMMANDS.filter((c) => c.label.startsWith(q) || q === "/");
  }, [input]);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      ts: new Date().toISOString(),
    };
    const cmd = findCommand(text);
    const reply = cmd ? cmd.run(insights) : fallbackReply(text);
    const botMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: reply,
      ts: new Date().toISOString(),
    };
    setMessages([...messages, userMsg, botMsg]);
    setInput("");
    setShowSlash(false);
  };

  const reset = () => setMessages([WELCOME]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border border-border bg-card/80 shadow-soft backdrop-blur-xl",
        variant === "page" ? "h-full" : "h-[560px]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-gradient-brand-soft px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-soft">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Ellie Assistant</div>
            <div className="text-[11px] text-muted-foreground">
              Trợ lý cá nhân · {ASSISTANT_COMMANDS.length} lệnh
            </div>
          </div>
        </div>
        <button
          onClick={reset}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-white/60 hover:text-foreground"
          title="Bắt đầu lại"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                m.role === "user"
                  ? "rounded-br-md bg-gradient-brand text-white"
                  : "rounded-bl-md bg-muted/70 text-foreground",
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-0 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1.5 border-t border-border/60 bg-muted/30 px-3 py-2">
        {ASSISTANT_COMMANDS.slice(0, 4).map((c) => (
          <button
            key={c.id}
            onClick={() => send(c.label)}
            className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            {c.emoji} {c.description}
          </button>
        ))}
      </div>

      {/* Slash autocomplete */}
      {showSlash && filteredCommands.length > 0 && (
        <div className="mx-3 mb-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-soft">
          {filteredCommands.map((c) => (
            <button
              key={c.id}
              onClick={() => send(c.label)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span>{c.emoji}</span>
              <span className="font-mono-brand text-xs text-primary">{c.label}</span>
              <span className="text-xs text-muted-foreground">— {c.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-border/60 p-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSlash(e.target.value.trim().startsWith("/"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
            if (e.key === "Escape") setShowSlash(false);
          }}
          placeholder="Hỏi gì đó hoặc gõ / để xem lệnh..."
          rows={1}
          className="scroll-thin max-h-32 flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-soft transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
