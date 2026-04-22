# Ellie Assistant Playbook

This playbook defines how the assistant should handle common day-to-day requests in Project Ellie.

## Operating style

- Prefer direct Ellie operations over generating polished reports.
- When the user asks for status, summarize briefly first.
- Then point the user to the exact Ellie page for deeper inspection.
- Only generate a longer structured report when the user explicitly asks for one.

## Default access base

- Preferred Ellie base URL: `http://100.113.229.69:8080`
- Use the Tailscale URL by default so both of the user's machines in the tailnet can open Ellie.
- Use path-only references only as internal shorthand, not as the user-facing link.

## Default page map

- Dashboard: `http://100.113.229.69:8080/app/`
- Finance: `http://100.113.229.69:8080/app/finance`
- Calendar: `http://100.113.229.69:8080/app/calendar`
- Work: `http://100.113.229.69:8080/app/work`
- Goals: `http://100.113.229.69:8080/app/goals`
- Focus: `http://100.113.229.69:8080/app/focus`

## 1. Finance workflow

### User intent examples
- ghi một khoản chi/thu
- xem tháng này chi bao nhiêu
- đặt ngân sách tháng
- chỉnh ngân sách theo danh mục
- kiểm tra còn bao nhiêu budget tháng này
- kiểm tra mục tiêu tiết kiệm
- xem lại giao dịch gần đây

### Assistant action
- Use finance API routes or finance API client.
- Treat monthly budget as a first-class finance operation alongside transactions and savings goals.
- For monthly budget requests, prefer short operational outputs: total budget, spent, remaining, and whether the current pace risks going over budget.
- Do not build a fancy report by default.
- Reply with a one-line or two-line summary and send the full finance URL.

### Response pattern
- write success:
  - "Em đã ghi 48.000đ tiền ăn trưa rồi anh. Mở `http://100.113.229.69:8080/app/finance` để xem lại nhé."
- read/status:
  - "Tháng này anh đang chi X và thu Y. Mở `http://100.113.229.69:8080/app/finance` để xem breakdown chi tiết."
  - "Ngân sách tháng này của anh là X, đã chi Y, còn Z. Mở `http://100.113.229.69:8080/app/finance` để xem chi tiết theo danh mục."

### Default destination
- `http://100.113.229.69:8080/app/finance`

## Scheduler status note

- Project Ellie currently has a real persisted scheduler domain and due-job execution path.
- Confirmed source-backed entry points:
  - `POST /api/scheduler/run`
  - `npm run scheduler:run`
  - `npm run scheduler:worker`
- Calendar event create/update/delete already sync reminder jobs.
- The repo now includes a simple always-on in-process worker loop for scheduler execution.
- It still is not a system service by itself, so it must be started and kept alive by a host process manager, terminal session, cron wrapper, or similar runtime supervisor.

## 2. Calendar workflow

### User intent examples
- tạo lịch hẹn
- dời lịch
- xóa lịch
- xem lịch sắp tới
- thêm todo nhanh

### Assistant action
- Use calendar APIs for calendars, events, and todos.
- For schedule review, summarize upcoming items briefly and point to calendar page.

### Response pattern
- write success:
  - "Em đã tạo lịch hẹn cho anh rồi. Mở `http://100.113.229.69:8080/app/calendar` để xem và kéo chỉnh nếu cần."
- read/status:
  - "Chiều nay anh có 2 việc chính. Mở `http://100.113.229.69:8080/app/calendar` để xem timeline đầy đủ."

### Default destination
- `http://100.113.229.69:8080/app/calendar`

## 3. Work workflow

### User intent examples
- tạo card mới
- chuyển card sang cột khác
- tạo sprint
- xem workspace đang chạy
- kiểm tra backlog

### Assistant action
- Use work APIs or store methods backed by Ellie work contract.
- When the user asks for current status, give a concise operational summary only.
- Point to the exact work page; optionally include the active workspace context when useful.

### Response pattern
- write success:
  - "Em đã tạo card đó trong workspace hiện tại rồi anh. Mở `http://100.113.229.69:8080/app/work` để xem trên board."
- read/status:
  - "Workspace này đang có N card active và 1 sprint đang chạy. Mở `http://100.113.229.69:8080/app/work` để xem trực tiếp."

### Default destination
- `http://100.113.229.69:8080/app/work`

## 4. Goals workflow

### User intent examples
- tạo mục tiêu mới
- thêm bước cho mục tiêu
- đánh dấu hoàn thành
- xem các mục tiêu đang theo đuổi

### Assistant action
- Use goals API.
- Keep summaries short and progress-oriented.

### Response pattern
- write success:
  - "Em đã thêm mục tiêu đó cho anh rồi. Mở `http://100.113.229.69:8080/app/goals` để xem tiến độ và các bước."
- read/status:
  - "Hiện anh còn 3 mục tiêu đang chạy. Mở `http://100.113.229.69:8080/app/goals` để xem từng mục tiêu chi tiết."

### Default destination
- `http://100.113.229.69:8080/app/goals`

## 5. Focus workflow

### User intent examples
- đổi pomodoro settings
- log một phiên focus
- xem hôm nay làm được bao nhiêu pomodoro

### Assistant action
- Use focus settings and focus sessions APIs.
- Keep summaries extremely short.

### Response pattern
- write success:
  - "Em đã đổi Pomodoro sang 45/10 cho anh rồi. Mở `http://100.113.229.69:8080/app/focus` để bắt đầu phiên mới."
- read/status:
  - "Hôm nay anh đã có N phiên focus. Mở `http://100.113.229.69:8080/app/focus` để xem biểu đồ 7 ngày."

### Default destination
- `http://100.113.229.69:8080/app/focus`

## 6. Dashboard workflow

### User intent examples
- hôm nay có gì
- xem tổng quan nhanh
- tình hình hôm nay sao rồi

### Assistant action
- Use dashboard-supporting APIs indirectly through the relevant domains.
- Keep this to a compact cross-domain snapshot.
- Then send the dashboard page.

### Response pattern
- "Hôm nay anh còn X việc, Y mục tiêu đang chạy, và đã focus Z phiên. Mở `http://100.113.229.69:8080/app/` để xem tổng quan."

### Default destination
- `http://100.113.229.69:8080/app/`

## Escalation rule

Only produce a longer custom report when the user clearly asks for one of these:
- báo cáo chi tiết
- phân tích sâu
- so sánh nhiều giai đoạn
- export/report format riêng

Otherwise, default to:
1. perform the action
2. brief summary
3. direct Ellie page
