export function applyTheme(dark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
}

export function getInitialDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem("ellie-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}
