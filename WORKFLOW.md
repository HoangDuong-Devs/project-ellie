# WORKFLOW

Tài liệu này dùng để theo dõi tiến trình làm việc và đồng bộ feature giữa `main` và `feature/local-dev`.

## Mục tiêu

- Mỗi feature hoàn thành phải có `commit` rõ ràng.
- Mỗi feature sau khi commit phải `push` ngay lên nhánh đang làm.
- Khi cần đồng bộ với `main`, thực hiện theo checklist bên dưới.
- Bước nào hoàn thành thì đánh dấu `- [x]` (đã vượt qua).

## Quy ước commit

- Format ưu tiên: `feat(scope): mô tả ngắn`
- Ví dụ:
  - `feat(chatbot): add assistant bubble and panel`
  - `feat(notifications): move prefs to server-backed store`
  - `fix(sync): resolve routeTree conflict after cherry-pick`

## Quy trình đồng bộ feature từ main sang local dev

### 1. Chuẩn bị

- [ ] Đảm bảo working tree sạch hoặc đã stash.
- [ ] `git fetch origin --prune`
- [ ] So sánh nhanh `origin/main...HEAD` để phát hiện commit thiếu trước khi code:
  - `git rev-list --left-right --count origin/main...HEAD`
  - `git log --oneline HEAD..origin/main`
- [ ] Xác định các commit cần lấy từ `origin/main`.

### 2. Đồng bộ

- [ ] Cherry-pick/rebase các commit cần thiết vào `feature/local-dev`.
- [ ] Resolve conflict (nếu có).
- [ ] Chạy build/test tối thiểu (`npm run build`).

### 3. Chốt feature

- [ ] Commit phần resolve/fix phát sinh (nếu có).
- [ ] Push lên remote: `git push origin feature/local-dev`.
- [ ] Cập nhật nhật ký bên dưới.

## Nhật ký tiến trình

### Mẫu

- Ngày:
- Feature:
- Nguồn: `main` / local
- Commit áp dụng:
- Kết quả: ✅ Hoàn thành / ⚠️ Có conflict
- Ghi chú:

### Log hiện tại

- Ngày: 2026-04-22
- Feature: Chatbot companion + layout tích hợp
- Nguồn: `origin/main` -> `feature/local-dev`
- Commit áp dụng: `d117546`, `00b4115`, `11883e0`, `0193ec3`
- Kết quả: ✅ Hoàn thành (đã resolve conflict ở `AppShell.tsx`, `routeTree.gen.ts`)
- Ghi chú: Đã bổ sung dependency `react-markdown`, `remark-gfm` để build pass.

- Ngày: 2026-04-22
- Feature: Dashboard UI Elysia refresh + style support
- Nguồn: `origin/main` -> `feature/local-dev`
- Commit áp dụng: `2299548`, `4d2d3f5`, `eac8a8c`, `7bddd01`
- Kết quả: ✅ Hoàn thành (đã resolve conflict tại `src/routes/app.index.tsx`)
- Ghi chú: Bổ sung bước bắt buộc kiểm tra diff main/local trước khi triển khai.

## Checklist phiên làm việc hiện tại

- [x] Xác định commit cần đồng bộ từ `main`.
- [x] Cherry-pick vào `feature/local-dev`.
- [x] Resolve conflict.
- [x] Build pass.
- [ ] Commit toàn bộ phần thay đổi dang dở hiện tại.
- [ ] Push toàn bộ lên remote.
