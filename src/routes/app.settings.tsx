import { createFileRoute } from "@tanstack/react-router";
import { Download, Moon, Sun, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { applyTheme, getInitialDark } from "@/lib/theme";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Cài đặt — ProjectEllie" }] }),
  component: Settings,
});

const KEYS = [
  "ellie:transactions",
  "ellie:todos",
  "ellie:schedule",
  "ellie:pomodoros",
  "ellie:focus-settings",
  "ellie:goals",
];

function Settings() {
  const [dark, setDark] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDark(getInitialDark()), []);

  function toggle() {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    try {
      localStorage.setItem("ellie-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  function exportData() {
    const data: Record<string, unknown> = {};
    KEYS.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) data[k] = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projectellie-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        Object.entries(data).forEach(([k, v]) => {
          if (KEYS.includes(k)) localStorage.setItem(k, JSON.stringify(v));
        });
        alert("Nhập dữ liệu thành công! Tải lại trang để xem.");
        location.reload();
      } catch {
        alert("File không hợp lệ.");
      }
    };
    reader.readAsText(file);
  }

  function clearAll() {
    if (!confirm("Xóa toàn bộ dữ liệu? Không thể hoàn tác.")) return;
    KEYS.forEach((k) => localStorage.removeItem(k));
    location.reload();
  }

  return (
    <div>
      <PageHeader title="Cài đặt" description="Tùy chỉnh giao diện và quản lý dữ liệu." />

      <div className="grid gap-4">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-3 font-semibold">Giao diện</h3>
          <button
            onClick={toggle}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent/10"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Chuyển sang Sáng" : "Chuyển sang Tối"}
          </button>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-3 font-semibold">Dữ liệu</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Toàn bộ dữ liệu lưu trên trình duyệt của bạn. Nên xuất backup định kỳ.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportData}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]"
            >
              <Download className="h-4 w-4" /> Xuất JSON
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent/10"
            >
              <Upload className="h-4 w-4" /> Nhập JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Xóa toàn bộ dữ liệu
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-2 font-semibold">Về ProjectEllie</h3>
          <p className="text-sm text-muted-foreground">
            Trợ lý cá nhân giúp bạn quản lý tài chính, lịch trình, focus và mục tiêu — hoàn toàn
            offline, riêng tư trên thiết bị của bạn.
          </p>
        </section>
      </div>
    </div>
  );
}
