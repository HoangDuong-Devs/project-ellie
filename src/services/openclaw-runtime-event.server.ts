import "@tanstack/react-start/server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function emitRuntimeWakeEvent(text: string) {
  const normalized = text.trim();
  if (!normalized) return { ok: false as const, skipped: true as const };

  try {
    const result = await execFileAsync("openclaw", [
      "system",
      "event",
      "--text",
      normalized,
      "--mode",
      "now",
      "--json",
    ]);
    return {
      ok: true as const,
      skipped: false as const,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return {
      ok: false as const,
      skipped: false as const,
      error: error instanceof Error ? error.message : "Failed to emit runtime wake event",
    };
  }
}
