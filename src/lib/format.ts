export function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
