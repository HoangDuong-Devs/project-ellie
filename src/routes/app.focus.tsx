import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  createFocusSession,
  getFocusSettings,
  listFocusSessions,
  patchFocusSettings,
} from "@/services/focus-api-client";
import { PageHeader } from "@/components/PageHeader";
import type { FocusSettings, PomodoroSession } from "@/types/focus";
import { useDataAutoRefresh } from "@/services/api-live-sync";

interface ActiveTimerState {
  mode: "work" | "break";
  secondsLeft: number;
  lastTickTime: number;
  segmentStart: number;
  running: boolean;
}

const ACTIVE_TIMER_KEY = "ellie:active-focus-timer";

export const Route = createFileRoute("/app/focus")({
  head: () => ({ meta: [{ title: "Focus — ProjectEllie" }] }),
  component: Focus,
});

function Focus() {
  const [settings, setSettings] = useState<FocusSettings>({
    workMinutes: 25,
    breakMinutes: 5,
  });
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(settings.workMinutes * 60);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const totalRef = useRef(settings.workMinutes * 60);
  const segmentStartRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);
  const hasRestoredRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const skipNextTimerResetRef = useRef(false);

  const refresh = useCallback(async () => {
    const [settingsRes, sessionsRes] = await Promise.all([getFocusSettings(), listFocusSessions()]);
    setSettings(settingsRes.settings);
    setSessions(sessionsRes.sessions);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [settingsRes, sessionsRes] = await Promise.all([
          getFocusSettings(),
          listFocusSessions(),
        ]);
        if (!active) return;
        setSettings(settingsRes.settings);
        setSessions(sessionsRes.sessions);

        // Restore active timer state
        try {
          const raw = localStorage.getItem(ACTIVE_TIMER_KEY);
          if (raw) {
            const state: ActiveTimerState = JSON.parse(raw);
            if (state.running) {
              const elapsedSinceLastPersist = Math.max(
                0,
                Math.floor((Date.now() - state.lastTickTime) / 1000),
              );
              const remainingSeconds = state.secondsLeft - elapsedSinceLastPersist;

              if (remainingSeconds > 0) {
                hasRestoredRef.current = true;
                setMode(state.mode);
                setSecondsLeft(remainingSeconds);
                totalRef.current =
                  (state.mode === "work"
                    ? settingsRes.settings.workMinutes
                    : settingsRes.settings.breakMinutes) * 60;
                setRunning(true);
                segmentStartRef.current = state.segmentStart;
                lastTickTimeRef.current = Date.now();
                localStorage.setItem(
                  ACTIVE_TIMER_KEY,
                  JSON.stringify({
                    ...state,
                    secondsLeft: remainingSeconds,
                    lastTickTime: Date.now(),
                  } satisfies ActiveTimerState),
                );
              } else {
                const elapsedSec = Math.floor((Date.now() - state.segmentStart) / 1000);
                const minutes = Math.max(1, Math.round(elapsedSec / 60));
                if (state.mode === "work" && minutes > 0) {
                  const data = await createFocusSession(minutes);
                  setSessions(data.sessions);
                  toast.success(`Đã lưu ${minutes} phút tập trung từ phiên đang chạy.`);
                }
                hasRestoredRef.current = true;
                setMode(state.mode === "work" ? "break" : "work");
                const nextTotal =
                  (state.mode === "work"
                    ? settingsRes.settings.breakMinutes
                    : settingsRes.settings.workMinutes) * 60;
                totalRef.current = nextTotal;
                setSecondsLeft(nextTotal);
                setRunning(false);
                segmentStartRef.current = null;
                lastTickTimeRef.current = null;
                localStorage.removeItem(ACTIVE_TIMER_KEY);
              }
            } else {
              hasRestoredRef.current = true;
              setMode(state.mode);
              setSecondsLeft(state.secondsLeft);
              setRunning(false);
              lastTickTimeRef.current = null;
              totalRef.current =
                (state.mode === "work"
                  ? settingsRes.settings.workMinutes
                  : settingsRes.settings.breakMinutes) * 60;
            }
          }
        } catch (e) {
          console.error("Failed to restore timer state", e);
        }
      } catch {
        // keep defaults
      } finally {
        if (active) {
          hasInitializedRef.current = true;
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useDataAutoRefresh(refresh, "focus");

  async function logSession(minutes: number) {
    if (minutes <= 0) return;
    try {
      const data = await createFocusSession(minutes);
      setSessions(data.sessions);
    } catch {
      // ignore
    }
  }

  function logElapsed() {
    if (segmentStartRef.current == null) return;
    const elapsedSec = Math.floor((Date.now() - segmentStartRef.current) / 1000);
    segmentStartRef.current = null;
    lastTickTimeRef.current = null;
    const minutes = Math.floor(elapsedSec / 60);
    if (mode === "work" && minutes > 0) {
      void logSession(minutes);
    }
  }

  function persistActiveTimer(nextSecondsLeft: number, tickTime: number) {
    if (segmentStartRef.current === null) return;
    localStorage.setItem(
      ACTIVE_TIMER_KEY,
      JSON.stringify({
        mode,
        secondsLeft: nextSecondsLeft,
        lastTickTime: tickTime,
        segmentStart: segmentStartRef.current,
        running: true,
      } satisfies ActiveTimerState),
    );
  }

  function syncRunningTimer(now = Date.now()) {
    if (!running) return;
    const lastTick = lastTickTimeRef.current ?? now;
    const elapsedSeconds = Math.max(0, Math.floor((now - lastTick) / 1000));
    if (elapsedSeconds <= 0) return;

    lastTickTimeRef.current = now;
    setSecondsLeft((current) => {
      const next = Math.max(0, current - elapsedSeconds);
      if (next === 0) {
        if (mode === "work" && segmentStartRef.current != null) {
          const elapsedSec = Math.floor((now - segmentStartRef.current) / 1000);
          const minutes = Math.max(1, Math.round(elapsedSec / 60));
          queueMicrotask(() => {
            void logSession(minutes);
          });
        }
        segmentStartRef.current = null;
        lastTickTimeRef.current = null;
        setRunning(false);
        setMode((currentMode) => (currentMode === "work" ? "break" : "work"));
        localStorage.removeItem(ACTIVE_TIMER_KEY);
        return 0;
      }

      persistActiveTimer(next, now);
      return next;
    });
  }

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (hasRestoredRef.current) {
      hasRestoredRef.current = false;
      return;
    }
    if (skipNextTimerResetRef.current) {
      skipNextTimerResetRef.current = false;
      return;
    }
    const total = (mode === "work" ? settings.workMinutes : settings.breakMinutes) * 60;
    totalRef.current = total;
    setSecondsLeft(total);
    setRunning(false);
    segmentStartRef.current = null;
    lastTickTimeRef.current = null;
    localStorage.removeItem(ACTIVE_TIMER_KEY);
  }, [mode, settings.workMinutes, settings.breakMinutes]);

  useEffect(() => {
    if (!running) return;
    if (segmentStartRef.current === null) {
      segmentStartRef.current = Date.now();
    }
    if (lastTickTimeRef.current === null) {
      lastTickTimeRef.current = Date.now();
    }
    const id = setInterval(() => {
      syncRunningTimer(Date.now());
    }, 1000);

    const syncFromVisibility = () => {
      if (!document.hidden) {
        syncRunningTimer(Date.now());
      }
    };

    window.addEventListener("focus", syncFromVisibility);
    document.addEventListener("visibilitychange", syncFromVisibility);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", syncFromVisibility);
      document.removeEventListener("visibilitychange", syncFromVisibility);
    };
  }, [running, mode]);

  function handleToggle() {
    if (running) {
      // pausing — log elapsed
      logElapsed();
      setRunning(false);
      localStorage.removeItem(ACTIVE_TIMER_KEY);
    } else {
      const now = Date.now();
      setRunning(true);
      segmentStartRef.current ??= now;
      lastTickTimeRef.current = now;
      persistActiveTimer(secondsLeft, now);
    }
  }

  function interruptActiveTimer() {
    if (running) {
      logElapsed();
    }
    setRunning(false);
    segmentStartRef.current = null;
    lastTickTimeRef.current = null;
    localStorage.removeItem(ACTIVE_TIMER_KEY);
  }

  function handleModeChange(nextMode: "work" | "break") {
    if (nextMode === mode) return;
    interruptActiveTimer();
    setMode(nextMode);
  }

  async function handleSettingsChange(patch: Partial<FocusSettings>) {
    const next = {
      ...settings,
      ...patch,
    };

    const currentModeDurationChanged =
      (mode === "work" && typeof patch.workMinutes === "number") ||
      (mode === "break" && typeof patch.breakMinutes === "number");

    skipNextTimerResetRef.current = true;

    if (currentModeDurationChanged) {
      const nextTotal = (mode === "work" ? next.workMinutes : next.breakMinutes) * 60;
      const elapsedSeconds = Math.max(0, totalRef.current - secondsLeft);
      const nextSecondsLeft = Math.max(0, nextTotal - elapsedSeconds);

      totalRef.current = nextTotal;
      setSecondsLeft(nextSecondsLeft);

      if (running) {
        const segmentStart =
          segmentStartRef.current ?? Date.now() - elapsedSeconds * 1000;
        const now = Date.now();
        segmentStartRef.current = segmentStart;
        lastTickTimeRef.current = now;
        persistActiveTimer(nextSecondsLeft, now);
      }
    }

    setSettings(next);

    try {
      const data = await patchFocusSettings(patch);
      setSettings(data.settings);
    } catch {
      // ignore
    }
  }

  function handleReset() {
    interruptActiveTimer();
    setSecondsLeft(totalRef.current);
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
                onChange={async (e) => {
                  const workMinutes = Math.max(1, Number(e.target.value));
                  await handleSettingsChange({ workMinutes });
                }}
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
                onChange={async (e) => {
                  const breakMinutes = Math.max(1, Number(e.target.value));
                  await handleSettingsChange({ breakMinutes });
                }}
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
              onClick={() => handleModeChange("work")}
              className={`rounded-full px-3 py-1 ${mode === "work" ? "bg-gradient-brand text-white" : "text-muted-foreground"}`}
            >
              Làm việc
            </button>
            <button
              onClick={() => handleModeChange("break")}
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
            {loading ? (
              "Đang tải dữ liệu focus..."
            ) : (
              <>
                Hôm nay đã hoàn thành{" "}
                <span className="font-bold text-foreground">{todayCount} 🍅</span>
              </>
            )}
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
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
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
