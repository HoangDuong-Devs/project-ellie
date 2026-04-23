import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  CalendarRange,
  Download,
  Moon,
  Sun,
  Sunrise,
  Target,
  Timer,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { requestNotificationPermission } from "@/hooks/useNotifications";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { REMINDER_PRESETS } from "@/lib/calendar";
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

type BooleanNotificationPrefKey = "calendar" | "finance" | "goal" | "focus" | "dailyDigest";

function Settings() {
  const [dark, setDark] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const { prefs, setPref, reset: resetPrefs } = useNotificationPrefs();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDark(getInitialDark());
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  async function enableNotifications() {
    const p = await requestNotificationPermission();
    setNotifPerm(p);
    if (p === "granted") {
      toast.success("Đã bật thông báo", {
        description: "Bạn sẽ nhận thông báo nhắc lịch & cảnh báo ngân sách.",
      });
      try {
        new Notification("ProjectEllie", { body: "Thông báo đã được bật ✨" });
      } catch {
        /* ignore */
      }
    } else if (p === "denied") {
      toast.error("Trình duyệt đã chặn thông báo", {
        description: "Mở cài đặt trình duyệt để cho phép thông báo từ trang này.",
      });
    }
  }

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

  function fmtReminder(min: number) {
    if (min === 0) return "Đúng giờ";
    if (min < 60) return `${min} phút trước`;
    if (min < 1440) return `${Math.round(min / 60)} giờ trước`;
    return `${Math.round(min / 1440)} ngày trước`;
  }

  function toggleDefaultReminder(min: number) {
    const exists = prefs.defaultCalendarReminders.includes(min);
    const next = exists
      ? prefs.defaultCalendarReminders.filter((v) => v !== min)
      : [...prefs.defaultCalendarReminders, min].sort((a, b) => b - a);
    setPref("defaultCalendarReminders", next);
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
          <h3 className="mb-2 font-semibold">Thông báo</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Cho phép thông báo đẩy để nhận nhắc nhở sự kiện trong lịch và cảnh báo khi vượt ngân
            sách.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {notifPerm === "granted" ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400">
                <Bell className="h-4 w-4" /> Đã bật thông báo
              </span>
            ) : notifPerm === "denied" ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
                <BellOff className="h-4 w-4" /> Trình duyệt đang chặn — mở cài đặt trình duyệt để
                cho phép
              </span>
            ) : (
              <button
                onClick={enableNotifications}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:scale-[1.02]"
              >
                <Bell className="h-4 w-4" /> Bật thông báo
              </button>
            )}
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Loại thông báo</h4>
              <button
                onClick={() => {
                  resetPrefs();
                  toast.success("Đã đặt lại tất cả về bật");
                }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Đặt lại
              </button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Tắt loại nào bạn không muốn nhận. Áp dụng cho cả thông báo đẩy, toast và bell trên
              thanh trên.
            </p>
            <div className="grid gap-2">
              {(
                [
                  {
                    key: "calendar",
                    label: "Lịch & nhắc sự kiện",
                    desc: "Nhắc trước khi sự kiện bắt đầu",
                    Icon: CalendarRange,
                  },
                  {
                    key: "finance",
                    label: "Tài chính",
                    desc: "Giao dịch mới & cảnh báo ngân sách",
                    Icon: Wallet,
                  },
                  {
                    key: "goal",
                    label: "Mục tiêu",
                    desc: "Khi hoàn thành mục tiêu đã đề ra",
                    Icon: Target,
                  },
                  {
                    key: "focus",
                    label: "Focus / Pomodoro",
                    desc: "Sau mỗi phiên tập trung hoàn tất",
                    Icon: Timer,
                  },
                  {
                    key: "dailyDigest",
                    label: "Tổng hợp hằng ngày",
                    desc: "Tóm tắt sự kiện trong ngày khi mở app",
                    Icon: Sunrise,
                  },
                ] as {
                  key: BooleanNotificationPrefKey;
                  label: string;
                  desc: string;
                  Icon: typeof Bell;
                }[]
              ).map(({ key, label, desc, Icon }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-accent/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                  </div>
                  <Switch checked={prefs[key]} onCheckedChange={(v) => setPref(key, v)} />
                </label>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Nhắc lại nếu chưa đọc</div>
                  <div className="text-xs text-muted-foreground">
                    Mặc định: nhắc lại sau 5 phút, tối đa 3 lần.
                  </div>
                </div>
                <Switch
                  checked={prefs.reminderRepeatEnabled}
                  onCheckedChange={(v) => setPref("reminderRepeatEnabled", v)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">
                  Chu kỳ nhắc lại (phút)
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={prefs.reminderRepeatIntervalMinutes}
                    onChange={(e) => {
                      const value = Math.max(1, Math.min(120, Number(e.target.value) || 1));
                      setPref("reminderRepeatIntervalMinutes", value);
                    }}
                    disabled={!prefs.reminderRepeatEnabled}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  />
                </label>

                <label className="text-xs text-muted-foreground">
                  Số lần tối đa
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={prefs.reminderRepeatMaxTimes}
                    onChange={(e) => {
                      const value = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                      setPref("reminderRepeatMaxTimes", value);
                    }}
                    disabled={!prefs.reminderRepeatEnabled}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <div className="mb-1 text-sm font-medium">Báo cáo tổng kết ngày</div>
              <div className="mb-3 text-xs text-muted-foreground">
                Gửi 1 thông báo tổng hợp toàn bộ chức năng vào giờ đã chọn mỗi ngày.
              </div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Bật để nhận tổng kết ngày trong khung 18:00 đến 01:00.
                </div>
                <Switch
                  checked={prefs.dailySummaryEnabled}
                  onCheckedChange={(v) => setPref("dailySummaryEnabled", v)}
                />
              </div>
              <label className="text-xs text-muted-foreground">
                Giờ gửi (18:00 - 01:00)
                <select
                  value={prefs.dailySummaryHour}
                  onChange={(e) => setPref("dailySummaryHour", Number(e.target.value))}
                  disabled={!prefs.dailySummaryEnabled}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value={18}>18:00</option>
                  <option value={19}>19:00</option>
                  <option value={20}>20:00</option>
                  <option value={21}>21:00</option>
                  <option value={22}>22:00</option>
                  <option value={23}>23:00</option>
                  <option value={0}>00:00 (hôm sau)</option>
                  <option value={1}>01:00 (hôm sau)</option>
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <div className="mb-2 text-sm font-medium">Nhắc lịch mặc định khi tạo sự kiện mới</div>
              <div className="mb-3 text-xs text-muted-foreground">
                Đây là giá trị mặc định. Khi tạo từng lịch, bạn vẫn có thể chỉnh riêng trong popup
                tạo sự kiện.
              </div>
              {prefs.defaultCalendarReminders.length === 0 ? (
                <div className="mb-3 text-xs text-muted-foreground">Hiện đang để: Không nhắc mặc định</div>
              ) : (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {prefs.defaultCalendarReminders.map((min) => (
                    <span
                      key={min}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {fmtReminder(min)}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {REMINDER_PRESETS.map((preset) => {
                  const active = prefs.defaultCalendarReminders.includes(preset.value);
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => toggleDefaultReminder(preset.value)}
                      className={
                        active
                          ? "rounded-full border border-transparent bg-gradient-brand px-2.5 py-1 text-xs font-medium text-white shadow-soft"
                          : "rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:border-primary"
                      }
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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
