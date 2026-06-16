# Ellie — Local Development README

Tài liệu ngắn gọn để chạy dự án này trên máy local.

## Yêu cầu

- Node.js (v18+) hoặc Bun (repo có `bun.lockb`).
- npm, pnpm hoặc bun để cài dependency.

## Cài đặt

Sử dụng Bun (nếu muốn):

```bash
bun install
```

Hoặc dùng npm:

```bash
npm install
```

## Lệnh thường dùng

- Chạy Vite dev server (frontend):

```bash
npm run dev
```

- Chạy cùng lúc frontend + scheduler worker:

```bash
npm run dev:all
```

-> `dev:all` khởi `vite dev` và `scheduler:worker` bằng script [scripts/run-dev-with-worker.mjs](scripts/run-dev-with-worker.mjs).

- Chạy worker riêng:

```bash
npm run scheduler:worker
```

- Build và preview production:

```bash
npm run build
npm run preview
npm run preview:all
```

- Các lệnh tiện ích:

```bash
npm run data:cli
npm run scheduler:run
npm run api:check-doc-sync
npm run lint
npm run format
```

## Notes cho developer

- Cấu hình chạy chi tiết nằm trong [package.json](package.json) và thư mục `scripts/`.
- Worker scheduler sử dụng `tsx` qua `npx` trong [scripts/run-scheduler-worker.mjs](scripts/run-scheduler-worker.mjs).
- Nếu dùng TypeScript runtime trong scripts, bạn cần `tsx` (dev dependency toàn cục hoặc cài khi cần).

## Tính năng mới đã đồng bộ từ `main`

- `Nhật ký`: route `/app/journal`, giao diện sổ lật trang, tạo/sửa/xóa entry theo ngày.
- `Trình soạn thảo`: editor rich text cơ bản cho nội dung nhật ký (bold, italic, underline, heading, quote, list).
- `Dữ liệu journal`: lưu local ở key `ellie:journal-entries`, đã được thêm vào luồng export/import/xóa dữ liệu trong `Settings`.
- `Companion`: có tồn tại trên `main` nhưng chưa được mang sang nhánh này vì đang dở dang và kéo thêm phụ thuộc assistant/VRM/Supabase.

## Muốn tôi làm tiếp?

- Tôi có thể: thêm mục hướng dẫn deploy, mô tả kiến trúc module, hoặc tạo file `.env.example` nếu cần.
