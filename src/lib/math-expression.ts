const ALLOWED_EXPRESSION = /^[\d+\-*/().\s=]+$/;

export function evaluateMathExpression(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith("=") ? trimmed.slice(1).trim() : trimmed;
  if (!normalized) return null;
  if (!ALLOWED_EXPRESSION.test(normalized)) return null;

  try {
    const value = Function(`"use strict"; return (${normalized});`)() as number;
    if (!Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function parseMoneyInput(input: string): number | null {
  const value = evaluateMathExpression(input);
  if (value == null) return null;
  return value > 0 ? value : null;
}
