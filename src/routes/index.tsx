import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles,
  Wallet,
  CalendarDays,
  Timer,
  Target,
  ArrowRight,
  CheckCircle2,
  Heart,
  Github,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProjectEllie — Trợ lý cá nhân Thông minh & Hiệu quả" },
      {
        name: "description",
        content:
          "ProjectEllie giúp bạn quản lý tài chính, lịch trình, mục tiêu và tập trung trong một ứng dụng duy nhất.",
      },
      { property: "og:title", content: "ProjectEllie — Trợ lý cá nhân All-in-One" },
      {
        property: "og:description",
        content: "Tài chính · Lịch trình · Focus · Mục tiêu — tất cả trong một.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Wallet,
    title: "Tài chính cá nhân",
    desc: "Theo dõi thu chi, phân tích bằng biểu đồ, đặt mục tiêu tiết kiệm.",
  },
  {
    icon: CalendarDays,
    title: "Lịch trình & Todo",
    desc: "Lên thời khóa biểu tuần và quản lý công việc theo mức ưu tiên.",
  },
  {
    icon: Timer,
    title: "Focus Pomodoro",
    desc: "Tập trung sâu với timer Pomodoro và thống kê hiệu suất.",
  },
  {
    icon: Target,
    title: "Mục tiêu",
    desc: "Đặt mục tiêu ngắn/dài hạn với tiến độ và các bước con.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-soft">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gradient-brand">ProjectEllie</span>
          </Link>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-transform hover:scale-105"
          >
            Vào ứng dụng <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Heart className="h-3.5 w-3.5 text-primary" />
              Trợ lý cá nhân của bạn
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Quản lý cuộc sống <br />
              <span className="text-gradient-brand">Thông minh & Hiệu quả</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              ProjectEllie hợp nhất tài chính, lịch trình, mục tiêu và focus vào một nơi duy nhất —
              đơn giản, đẹp mắt, hoàn toàn riêng tư trên thiết bị của bạn.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-soft transition-transform hover:scale-105"
              >
                Bắt đầu ngay <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent/10"
              >
                Xem tính năng
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Mọi thứ bạn cần, <span className="text-gradient-brand">trong một app</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Bốn module mạnh mẽ được thiết kế để đồng hành cùng bạn mỗi ngày.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-soft">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Highlight */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-brand p-8 text-white shadow-soft sm:p-14">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h3 className="text-3xl font-bold sm:text-4xl">Riêng tư & nhanh chóng</h3>
              <p className="mt-4 text-white/90">
                Tất cả dữ liệu được lưu cục bộ trên trình duyệt của bạn. Không cần đăng ký, không
                cần kết nối — sẵn sàng dùng ngay.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {[
                  "Hoạt động hoàn toàn offline",
                  "Xuất/nhập dữ liệu JSON",
                  "Giao diện tối/sáng",
                  "Mobile-first, mượt trên mọi thiết bị",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> {t}
                  </li>
                ))}
              </ul>
              <Link
                to="/app"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow-soft transition-transform hover:scale-105"
              >
                Mở ứng dụng <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Module", v: "5" },
                { label: "Offline", v: "100%" },
                { label: "Phí dùng", v: "0₫" },
                { label: "Quảng cáo", v: "Không" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white/15 p-5 backdrop-blur-sm"
                >
                  <div className="text-3xl font-bold">{s.v}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-white/80">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            © {new Date().getFullYear()} ProjectEllie
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a className="inline-flex items-center gap-1.5 hover:text-foreground" href="#">
              <Mail className="h-4 w-4" /> Liên hệ
            </a>
            <a className="inline-flex items-center gap-1.5 hover:text-foreground" href="#">
              <Github className="h-4 w-4" /> GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
