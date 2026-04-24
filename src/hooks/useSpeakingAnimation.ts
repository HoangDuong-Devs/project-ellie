import { useEffect, useRef, useState } from "react";

/**
 * Drives a 0..1 "speakingLevel" value used for lip-sync.
 * When `text` changes (assistant just produced a new message), animate from
 * full intensity down to 0 over `durationMs`.
 */
export function useSpeakingAnimation(triggerKey: string | number | null, durationMs = 2500) {
  const [level, setLevel] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (triggerKey === null) return;
    startRef.current = performance.now();

    const tick = () => {
      if (startRef.current == null) return;
      const elapsed = performance.now() - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // Smooth fade: ease-out
      const env = 1 - progress;
      // Add small jitter so the mouth isn't perfectly even
      const jitter = 0.85 + Math.random() * 0.3;
      setLevel(Math.max(0, env * jitter));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setLevel(0);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [triggerKey, durationMs]);

  return level;
}

/** Naive sentiment → mood mapping based on keywords/emojis. */
export function detectMood(text: string): "neutral" | "happy" | "sad" | "surprised" | "relaxed" {
  const t = text.toLowerCase();
  if (/[😊😄😁🥰❤️✨🎉]|tuyệt|tốt|giỏi|hay quá|chúc mừng|happy|great/.test(t)) return "happy";
  if (/[😢😭😞]|tiếc|buồn|xin lỗi|sorry|sad/.test(t)) return "sad";
  if (/[😲😮‼️]|wow|ồ|ơ|thật sao|surprised|oh/.test(t)) return "surprised";
  if (/[😌🍵]|thư giãn|nghỉ|relax|calm/.test(t)) return "relaxed";
  return "neutral";
}
