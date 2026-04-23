import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
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

export const Route = createFileRoute("/app/companion")({
  head: () => ({
    meta: [
      { title: "Companion — ProjectEllie" },
      {
        name: "description",
        content: "Trò chuyện cùng nhân vật AI 3D Ellie — companion mode kiểu Grok.",
      },
    ],
  }),
  component: CompanionPage,
});

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
    "Chào bạn! Mình là **Ellie** ✨",
    "",
    "Đây là chế độ Companion — bạn có thể vừa nhìn mình vừa trò chuyện. Thử các lệnh nhanh phía dưới hoặc gõ `/` để xem tất cả lệnh nhé.",
  ].join("\n"),
};

// AIRI hosted demo URL — has VRM stage with default character
const AIRI_STAGE_URL = "https://airi.moeru.ai/";

function findCommand(text: string): AssistantCommand | null {
  const t = text.trim().toLowerCase();
  if (!t.startsWith("/")) return null;
  const name = t.split(/\s+/)[0];
  return ASSISTANT_COMMANDS.find((c) => c.label === name) ?? null;
}

function fallbackReply(text: string): string {
  const t = text.toLowerCase();
  if (/(hello|hi|chào|hey)/i.test(t)) return "Chào bạn! 👋 Bắt đầu với `/tongquan` nhé.";
  if (/(chi|tiêu|ngân sách|tiền)/.test(t))
    return "Mình có thể giúp với chi tiêu! Thử `/baocao-ngay` hoặc `/ngansach`.";
  if (/(lịch|sự kiện)/.test(t)) return "Gõ `/lich-homnay` để xem lịch hôm nay nhé.";
  if (/(mục tiêu|goal)/.test(t)) return "Gõ `/muctieu` để xem tiến độ nhé.";
  if (/(focus|pomodoro)/.test(t)) return "Thử `/focus` để xem thống kê tập trung.";
  return [
    "Hiện mình hỗ trợ các lệnh báo cáo. Gõ `/` để xem danh sách:",
    "",
    ASSISTANT_COMMANDS.map((c) => `- \`${c.label}\` — ${c.description}`).join("\n"),
  ].join("\n");
}

function CompanionPage() {
  const insights = useAssistantInsights();
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>("ellie:companion-chat", [
    WELCOME,
  ]);
  const [input, setInput] = useState("");
  const [showSlash, setShowSlash] = useState(false);
  const [showAvatar, setShowAvatar] = useLocalStorage("ellie:companion-show-avatar", true);
  const [chatExpanded, setChatExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const filteredCommands = input.trim().startsWith("/")
    ? ASSISTANT_COMMANDS.filter(
        (c) => c.label.startsWith(input.trim().toLowerCase()) || input.trim() === "/",
      )
    : [];

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
    <div className="-mx-4 -mt-6 lg:-mx-8 lg:-mt-6">
      {/* Full-bleed companion stage. Height fills viewport minus desktop topbar (56px) and accounts for mobile bottom nav padding (96px from main pb-24) */}
      <div
        className={cn(
          "relative overflow-hidden rounded-none bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950",
          "h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)]",
          "min-h-[600px]",
        )}
      >
        {/* Aurora glow background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-1/4 left-1/4 h-[600px] w-[600px] rounded-full bg-purple-500/30 blur-[120px]" />
          <div className="absolute -bottom-1/4 right-1/4 h-[600px] w-[600px] rounded-full bg-pink-500/30 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/20 blur-[100px]" />
        </div>

        {/* Avatar layer (AIRI iframe) */}
        {showAvatar && (
          <iframe
            src={AIRI_STAGE_URL}
            title="Ellie 3D Avatar"
            className="absolute inset-0 h-full w-full border-0"
            style={{ background: "transparent" }}
            allow="microphone; camera; autoplay; clipboard-write"
          />
        )}

        {/* Top control bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
          <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-md">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-brand">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-white">Ellie · Companion</span>
            <span className="ml-1 flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAvatar(!showAvatar)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"
              title={showAvatar ? "Ẩn nhân vật" : "Hiện nhân vật"}
            >
              {showAvatar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={reset}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"
              title="Bắt đầu lại"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChatExpanded(!chatExpanded)}
              className="hidden h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50 lg:flex"
              title={chatExpanded ? "Thu nhỏ chat" : "Mở rộng chat"}
            >
              {chatExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Chat overlay - desktop: floating right panel; mobile: bottom sheet */}
        <div
          className={cn(
            "absolute z-20 transition-all duration-300",
            // Mobile: bottom sheet
            "left-3 right-3 bottom-3",
            chatExpanded ? "top-[40%]" : "top-auto",
            // Desktop: right floating panel
            "lg:left-auto lg:right-6 lg:top-20 lg:bottom-6",
            chatExpanded ? "lg:w-[420px]" : "lg:w-[420px] lg:top-auto lg:h-auto",
          )}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-black/40 shadow-2xl backdrop-blur-xl">
            {/* Chat header (mobile collapse handle) */}
            <button
              onClick={() => setChatExpanded(!chatExpanded)}
              className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-left transition hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-white/70" />
                <span className="text-sm font-medium text-white">Trò chuyện</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                  {messages.length}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-white/50 transition-transform",
                  chatExpanded ? "" : "rotate-180",
                )}
              />
            </button>

            {chatExpanded && (
              <>
                {/* Messages */}
                <div
                  ref={scrollRef}
                  className="scroll-thin flex-1 space-y-3 overflow-y-auto px-3 py-3"
                >
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                          m.role === "user"
                            ? "rounded-br-md bg-gradient-brand text-white shadow-glow"
                            : "rounded-bl-md bg-white/10 text-white backdrop-blur-md",
                        )}
                      >
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none prose-headings:mt-0 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-white prose-code:text-pink-300">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-3 py-2">
                  {ASSISTANT_COMMANDS.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => send(c.label)}
                      className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/90 transition hover:border-white/40 hover:bg-white/10"
                    >
                      {c.emoji} {c.description}
                    </button>
                  ))}
                </div>

                {/* Slash autocomplete */}
                {showSlash && filteredCommands.length > 0 && (
                  <div className="mx-3 mb-1 max-h-48 overflow-y-auto rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl">
                    {filteredCommands.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => send(c.label)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                      >
                        <span>{c.emoji}</span>
                        <span className="font-mono-brand text-xs text-pink-300">
                          {c.label}
                        </span>
                        <span className="text-xs text-white/50">— {c.description}</span>
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
                  className="flex items-end gap-2 border-t border-white/10 p-2.5"
                >
                  <textarea
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
                    placeholder="Nói chuyện với Ellie hoặc gõ /..."
                    rows={1}
                    className="scroll-thin max-h-24 flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Loading hint when avatar is loading */}
        {showAvatar && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden lg:block">
            <div className="rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/60 backdrop-blur-md">
              Powered by Project AIRI
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
