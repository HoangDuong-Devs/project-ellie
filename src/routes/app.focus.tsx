import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Settings as SettingsIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { uid } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import type { FocusSettings, PomodoroSession } from "@/types/focus";

export const Route = createFileRoute("/app/focus")({
  head: () => ({ meta: [{ title: "Focus — ProjectEllie" }] }),
  component: Focus,
});

function Focus() {
  const [settings, setSettings] = useLocalStorage<FocusSettings>("ellie:focus-settings", {
    workMinutes: 25,
    breakMinutes: 5,
  });
  const [sessions, setSessions] = useLocalStorage<PomodoroSession[]>("ellie:pomodoros", []);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(settings.workMinutes * 60);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const totalRef = useRef(settings.workMinutes * 60);
  const segmentStartRef = useRef<number | null>(null);

  function logElapsed() {
    if (segmentStartRef.current == null) return;
    const elapsedSec = Math.floor((Date.now() - segmentStartRef.current) / 1000);
    segmentStartRef.current = null;
    const minutes = Math.floor(elapsedSec / 60);
    if (mode === "work" && minutes > 0) {
      setSessions((prev) => [
        { id: uid(), date: new Date().toISOString(), minutes },
        ...prev,
      ]);
    }
  }

  useEffect(() => {
    const total = (mode === "work" ? settings.workMinutes : settings.breakMinutes) * 60;
    totalRef.current = total;
    setSecondsLeft(total);
    setRunning(false);
    segmentStartRef.current = null;
  }, [mode, settings.workMinutes, settings.breakMinutes]);

  useEffect(() => {
    if (!running) return;
    segmentStartRef.current = Date.now();
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          // log full segment on natural completion
          if (mode === "work" && segmentStartRef.current != null) {
            const elapsedSec = Math.floor((Date.now() - segmentStartRef.current) / 1000);
            const minutes = Math.max(1, Math.round(elapsedSec / 60));
            setSessions((prev) => [
              { id: uid(), date: new Date().toISOString(), minutes },
              ...prev,
            ]);
          }
          segmentStartRef.current = null;
          setRunning(false);
          setMode((m) => (m === "work" ? "break" : "work"));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  function handleToggle() {
    if (running) {
      // pausing — log elapsed
      logElapsed();
      setRunning(false);
    } else {
      setRunning(true);
    }
  }

  function handleReset() {
    if (running) logElapsed();
    setRunning(false);
    setSecondsLeft(totalRef.current);
    segmentStartRef.current = null;
  }

  const progress = 1 - secondsLeft / totalRef.current;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const today = new Date().toDateString();
  const todayCount = sessions.filter((s) => new Date(s.date).toDateString() === today).length;

  const weekData = useMemo(() => {
    const days: { name: string; minutes: number }[] = [];
    const labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const minutes = sessions
        .filter((s) => new Date(s.date).toDateString() === d.toDateString())
        .reduce((sum, s) => sum + s.minutes, 0);
      days.push({ name: labels[d.getDay()], minutes });
    }
    return days;
  }, [sessions]);

  const r = 110;
  const C = 2 * Math.PI * r;

  return (
    <div>
      <PageHeader
        title="Focus Pomodoro"
        description="Tập trung sâu, nghỉ ngơi đúng lúc."
        actions={
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent/10"
          >
            <SettingsIcon className="h-4 w-4" /> Tùy chỉnh
          </button>
        }
      />

      {showSettings && (
        <div className="mb-5 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-muted-foreground">Phút làm việc</div>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.workMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, workMinutes: Math.max(1, Number(e.target.value)) })
                }
                className="w-full rounded-xl border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-muted-foreground">Phút nghỉ</div>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.breakMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, breakMinutes: Math.max(1, Number(e.target.value)) })
                }
                className="w-full rounded-xl border border-input bg-background px-3 py-2"
              />
            </label>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-8 shadow-soft">
          <div className="mb-4 inline-flex rounded-full border border-border bg-muted/40 p-1 text-xs">
            <button
              onClick={() => setMode("work")}
              className={`rounded-full px-3 py-1 ${mode === "work" ? "bg-gradient-brand text-white" : "text-muted-foreground"}`}
            >
              Làm việc
            </button>
            <button
              onClick={() => setMode("break")}
              className={`rounded-full px-3 py-1 ${mode === "break" ? "bg-gradient-brand text-white" : "text-muted-foreground"}`}
            >
              Nghỉ
            </button>
          </div>

          <div className="relative">
            <svg width="260" height="260" viewBox="0 0 260 260">
              <defs>
                <linearGradient id="ellieGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <circle cx="130" cy="130" r={r} stroke="var(--muted)" strokeWidth="14" fill="none" />
              <circle
                cx="130"
                cy="130"
                r={r}
                stroke="url(#ellieGrad)"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - progress)}
                transform="rotate(-90 130 130)"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-5xl font-bold tabular-nums">
                {mm}:{ss}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {mode === "work" ? "Tập trung" : "Nghỉ ngơi"}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleToggle}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:scale-105"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Tạm dừng" : "Bắt đầu"}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent/10"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>

          <div className="mt-6 text-sm text-muted-foreground">
            Hôm nay đã hoàn thành <span className="font-bold text-foreground">{todayCount} 🍅</span>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-4 font-semibold">Phút tập trung 7 ngày qua</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={weekData}>
                <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }}
                />
                <Bar dataKey="minutes" fill="url(#ellieGrad2)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="ellieGrad2" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
