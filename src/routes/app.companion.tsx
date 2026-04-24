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
  Loader2,
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
import { VRMCanvas, type CompanionMood } from "@/components/companion/VRMCanvas";
import { useSpeakingAnimation, detectMood } from "@/hooks/useSpeakingAnimation";
import { toast } from "sonner";

export const Route = createFileRoute("/app/companion")({
  head: () => ({
    meta: [
      { title: "Companion — ProjectEllie" },
      {
        name: "description",
        content: "Trò chuyện cùng nhân vật AI 3D Ellie — companion mode với VRM viewer và Lovable AI.",
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
    "Chào cậu! Mình là **Ellie** ✨",
    "",
    "Mình ở đây để trò chuyện với cậu nè. Cứ hỏi mình bất cứ điều gì, hoặc gõ `/` để xem các lệnh báo cáo nhanh.",
  ].join("\n"),
};

function findCommand(text: string): AssistantCommand | null {
  const t = text.trim().toLowerCase();
  if (!t.startsWith("/")) return null;
  const name = t.split(/\s+/)[0];
  return ASSISTANT_COMMANDS.find((c) => c.label === name) ?? null;
}

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: { role: "user" | "assistant"; content: string }[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  signal?: AbortSignal;
}) {
  try {
    const resp = await fetch("/api/companion-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!resp.ok) {
      let errMsg = `HTTP ${resp.status}`;
      try {
        const data = await resp.json();
        if (data?.error) errMsg = data.error;
      } catch {
        /* ignore */
      }
      onError(errMsg);
      return;
    }

    if (!resp.body) {
      onError("Không nhận được phản hồi");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") {
          streamDone = true;
          break;
        }
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) onDelta(delta);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const json = raw.slice(6).trim();
        if (json === "[DONE]") continue;
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) onDelta(delta);
        } catch {
          /* ignore */
        }
      }
    }
    onDone();
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    onError(e instanceof Error ? e.message : "Lỗi không rõ");
  }
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [mood, setMood] = useState<CompanionMood>("happy");
  const [speakTrigger, setSpeakTrigger] = useState<number | null>(null);
  const speakingLevel = useSpeakingAnimation(speakTrigger, 2200);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const filteredCommands = input.trim().startsWith("/")
    ? ASSISTANT_COMMANDS.filter(
        (c) => c.label.startsWith(input.trim().toLowerCase()) || input.trim() === "/",
      )
    : [];

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      ts: new Date().toISOString(),
    };
    setInput("");
    setShowSlash(false);

    // Slash command? Reply locally (no AI call).
    const cmd = findCommand(text);
    if (cmd) {
      const reply = cmd.run(insights);
      const botMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: reply,
        ts: new Date().toISOString(),
      };
      setMessages([...messages, userMsg, botMsg]);
      setMood(detectMood(reply));
      setSpeakTrigger(Date.now());
      return;
    }

    // Otherwise → stream from Lovable AI
    const baseHistory = [...messages, userMsg];
    const assistantId = uid();
    const placeholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      ts: new Date().toISOString(),
    };
    setMessages([...baseHistory, placeholder]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assembled = "";
    await streamChat({
      messages: baseHistory.map((m) => ({ role: m.role, content: m.content })),
      signal: controller.signal,
      onDelta: (chunk) => {
        assembled += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: assembled } : m)),
        );
        setSpeakTrigger(Date.now()); // refresh mouth animation each token
      },
      onDone: () => {
        setIsStreaming(false);
        setMood(detectMood(assembled));
      },
      onError: (msg) => {
        setIsStreaming(false);
        toast.error(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `_Xin lỗi, có lỗi xảy ra: ${msg}_` }
              : m,
          ),
        );
      },
    });
  };

  const reset = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages([WELCOME]);
    setMood("happy");
  };

  return (
    <div className="-mx-4 -mt-6 lg:-mx-8 lg:-mt-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-none bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950",
          "h-[calc(100vh-56px)]",
          "min-h-[600px]",
        )}
      >
        {/* Aurora glow background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-1/4 left-1/4 h-[600px] w-[600px] rounded-full bg-purple-500/30 blur-[120px]" />
          <div className="absolute -bottom-1/4 right-1/4 h-[600px] w-[600px] rounded-full bg-pink-500/30 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/20 blur-[100px]" />
        </div>

        {/* VRM avatar layer */}
        {showAvatar && (
          <VRMCanvas
            mood={mood}
            speakingLevel={speakingLevel}
            className="absolute inset-0 h-full w-full"
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
            {isStreaming && (
              <span className="ml-2 flex items-center gap-1 text-[10px] text-white/70">
                <Loader2 className="h-3 w-3 animate-spin" />
                đang nghĩ...
              </span>
            )}
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

        {/* Chat overlay */}
        <div
          className={cn(
            "absolute z-20 transition-all duration-300",
            "left-3 right-3 bottom-3",
            chatExpanded ? "top-[40%]" : "top-auto",
            "lg:left-auto lg:right-6 lg:top-20 lg:bottom-6",
            "lg:w-[420px]",
            !chatExpanded && "lg:top-auto lg:h-auto",
          )}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-black/40 shadow-2xl backdrop-blur-xl">
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
                          m.content ? (
                            <div className="prose prose-sm prose-invert max-w-none prose-headings:mt-0 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-white prose-code:text-pink-300">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {m.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-white/60">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span className="text-xs">Ellie đang gõ...</span>
                            </span>
                          )
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
                      disabled={isStreaming}
                      className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/90 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-50"
                    >
                      {c.emoji} {c.description}
                    </button>
                  ))}
                </div>

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
                    placeholder={
                      isStreaming ? "Ellie đang trả lời..." : "Nói chuyện với Ellie hoặc gõ /..."
                    }
                    rows={1}
                    disabled={isStreaming}
                    className="scroll-thin max-h-24 flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isStreaming}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {showAvatar && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden lg:block">
            <div className="rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/60 backdrop-blur-md">
              VRM · Lovable AI
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
