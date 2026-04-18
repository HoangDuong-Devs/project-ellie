

# ProjectEllie — Trợ lý cá nhân All-in-One

Xây dựng lại SmartLife với tên **ProjectEllie**, phong cách **gradient hồng-xanh**. Lưu trữ cục bộ (localStorage), chưa cần đăng nhập hay AI thật. Đã loại: GPA Tracker, Music Player, Đếm ngược ngày lễ/Lịch vạn niên, My Storage.

## 🎨 Hệ thống thiết kế

- Gradient chủ đạo: **hồng (pink/rose) → xanh (cyan/sky)**, dùng cho hero, nút CTA, badge, biểu đồ
- Nền sáng, card bo góc lớn, bóng mềm, hiệu ứng glassmorphism nhẹ
- Font hiện đại (Inter), tiếng Việt
- Dark mode tùy chọn
- Responsive: mobile-first, có bottom nav trên mobile

## 🗺️ Cấu trúc route

**Trang giới thiệu (public):**
- `/` — Landing: hero "Quản lý cuộc sống Thông minh & Hiệu quả", các section feature (Tổng quan, Tài chính, Lịch trình, Focus, Mục tiêu), CTA "Vào ứng dụng", footer liên hệ

**Ứng dụng (app shell có sidebar/bottom nav):**
- `/app` — Dashboard tổng quan: thẻ tóm tắt thu/chi tháng, todo hôm nay, mục tiêu đang chạy, mini Pomodoro
- `/app/finance` — Tài chính: thêm thu/chi, danh mục, biểu đồ cột & tròn, báo cáo theo tháng, mục tiêu tiết kiệm
- `/app/schedule` — Lịch trình & Todo: thời khóa biểu tuần, todo list theo mức ưu tiên (cao/trung/thấp), đánh dấu hoàn thành
- `/app/focus` — Focus Pomodoro: timer tùy chỉnh (25/5, có thể đổi), thống kê số phiên trong ngày/tuần
- `/app/goals` — Mục tiêu: tạo mục tiêu ngắn/dài hạn, thanh tiến độ, hạn chót, các bước con
- `/app/settings` — Cài đặt: dark mode, xuất/nhập dữ liệu JSON, xóa toàn bộ

## 💾 Dữ liệu

- Tất cả lưu trong `localStorage` qua một hook `useLocalStorage` thống nhất
- Mỗi module có "store" riêng: transactions, todos, scheduleItems, pomodoroSessions, goals
- Có nút **Xuất dữ liệu** (JSON) và **Nhập dữ liệu** trong Settings để backup

## 📊 Chi tiết các module

**Tài chính:** thêm giao dịch (số tiền VND, danh mục, ghi chú, ngày, loại thu/chi) → biểu đồ cột thu vs chi 6 tháng + biểu đồ tròn cơ cấu chi tiêu (Recharts) + danh sách giao dịch lọc theo tháng

**Lịch trình:** lưới tuần 7 ngày × các khung giờ, kéo/click để thêm sự kiện; Todo riêng phân theo Hôm nay / Sắp tới / Đã xong, gắn ưu tiên

**Focus:** timer lớn ở giữa, vòng tiến độ gradient hồng-xanh, nút Start/Pause/Reset, đếm số 🍅 hoàn thành hôm nay, biểu đồ phút tập trung 7 ngày

**Mục tiêu:** card mỗi mục tiêu kèm % tiến độ, danh sách bước con (checklist), deadline đếm ngược, badge khi hoàn thành

## 🧭 Điều hướng

- Header landing: logo ProjectEllie + nút "Vào ứng dụng"
- Trong app: sidebar trái (desktop) / bottom tab bar (mobile) gồm 5 mục: Tổng quan · Tài chính · Lịch trình · Focus · Mục tiêu

## 📦 Phụ thuộc

- `recharts` cho biểu đồ
- `date-fns` cho xử lý ngày tháng tiếng Việt
- `lucide-react` (đã có) cho icon
- `framer-motion` cho hiệu ứng chuyển trang/card mượt

## ✅ Sau khi xong

Bạn có một bản app hoàn chỉnh hoạt động hoàn toàn offline. Có thể nâng cấp sau: thêm Lovable Cloud để đồng bộ tài khoản, thêm AI Advisor thật bằng Lovable AI Gateway.

