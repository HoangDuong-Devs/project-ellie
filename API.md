# Local API Contract

Base URL when running dev: `http://localhost:8080` (or next available port shown by Vite).

All API responses are JSON.

## Finance

### `GET /api/finance/transactions`
Response:
```json
{ "transactions": [Transaction] }
```

### `POST /api/finance/transactions`
Body:
```json
{
  "type": "income | expense",
  "amount": 100000,
  "category": "string",
  "note": "optional string",
  "date": "YYYY-MM-DD or ISO"
}
```
Response:
```json
{ "transactions": [Transaction] }
```

### `PATCH /api/finance/transactions`
Body:
```json
{
  "id": "transaction-id",
  "patch": {
    "type": "income | expense",
    "amount": 120000,
    "category": "string",
    "note": "string",
    "date": "YYYY-MM-DD or ISO"
  }
}
```

### `DELETE /api/finance/transactions`
Body:
```json
{ "id": "transaction-id" }
```

### `GET /api/finance/summary?year=2026&month=3`
- `month` is zero-based (`0..11`).
Response:
```json
{
  "year": 2026,
  "month": 3,
  "summary": { "income": 0, "expense": 120000, "balance": -120000 },
  "monthTransactions": [Transaction],
  "totalBalance": -120000
}
```

### `GET /api/finance/savings-goals`
Response:
```json
{ "goals": [SavingsGoal] }
```

### `POST /api/finance/savings-goals`
Body:
```json
{ "title": "Quỹ dự phòng", "target": 50000000 }
```

### `PATCH /api/finance/savings-goals`
Body:
```json
{ "id": "goal-id", "patch": { "title": "Mục tiêu mới", "target": 70000000 } }
```

### `DELETE /api/finance/savings-goals`
Body:
```json
{ "id": "goal-id" }
```

### `GET /api/finance/monthly-budget?year=2026&month=3`
Response:
```json
{
  "year": 2026,
  "month": 3,
  "key": "2026-04",
  "budget": {
    "total": 10000000,
    "categories": { "Ăn uống": 3000000, "Di chuyển": 1000000 }
  }
}
```

### `POST /api/finance/monthly-budget`
Body:
```json
{
  "year": 2026,
  "month": 3,
  "budget": {
    "total": 12000000,
    "categories": { "Ăn uống": 3500000, "Giải trí": 1000000 }
  }
}
```

## Calendar

### `GET /api/calendar/events`
Response:
```json
{ "items": [CalendarItem] }
```

### `POST /api/calendar/events`
Body (`item` wrapper optional):
```json
{
  "title": "Meeting",
  "startISO": "2026-04-20T09:00",
  "endISO": "2026-04-20T10:00",
  "allDay": false,
  "calendarId": "work",
  "recurrence": "none"
}
```

### `PATCH /api/calendar/events`
Body:
```json
{
  "id": "event-id",
  "patch": { "title": "Updated title", "reminders": [10, 60] }
}
```

### `DELETE /api/calendar/events`
Body:
```json
{ "id": "event-id" }
```

### `GET /api/calendar/calendars`
Response:
```json
{ "calendars": [Calendar] }
```

### `POST /api/calendar/calendars`
Body:
```json
{ "name": "My Calendar", "color": "cyan", "visible": true }
```

### `PATCH /api/calendar/calendars`
Body:
```json
{ "id": "calendar-id", "patch": { "name": "New name", "visible": false } }
```

### `DELETE /api/calendar/calendars`
Body:
```json
{ "id": "calendar-id" }
```

### `GET /api/calendar/todos`
Response:
```json
{ "todos": [Todo] }
```

### `POST /api/calendar/todos`
Body:
```json
{ "title": "Todo", "priority": "low | medium | high", "dueDate": "optional" }
```

### `PATCH /api/calendar/todos`
Body:
```json
{ "id": "todo-id", "patch": { "done": true } }
```

### `DELETE /api/calendar/todos`
Body:
```json
{ "id": "todo-id" }
```

## Work

### `GET /api/work/data`
Response:
```json
{ "data": WorkData }
```

### `GET /api/work/workspaces`
### `POST /api/work/workspaces`
Body:
```json
{ "name": "Workspace", "icon": "🚀", "color": "pink", "useSprints": true }
```

### `PATCH /api/work/workspaces`
Body:
```json
{ "id": "workspace-id", "patch": { "name": "New name" } }
```

### `DELETE /api/work/workspaces`
Body:
```json
{ "id": "workspace-id" }
```

### `GET /api/work/cards?workspaceId=...`
### `POST /api/work/cards`
Body:
```json
{ "workspaceId": "...", "title": "Card title", "columnId": "optional" }
```

### `PATCH /api/work/cards`
Body:
```json
{ "id": "card-id", "patch": { "priority": "high" } }
```

### `DELETE /api/work/cards`
Body:
```json
{ "id": "card-id" }
```

### `GET /api/work/columns?workspaceId=...`
### `POST /api/work/columns`
Body:
```json
{ "workspaceId": "...", "name": "In Review" }
```

### `PATCH /api/work/columns`
Body:
```json
{ "id": "column-id", "patch": { "name": "Done" } }
```

### `DELETE /api/work/columns`
Body:
```json
{ "id": "column-id" }
```

### `GET /api/work/labels`
### `POST /api/work/labels`
Body:
```json
{ "name": "Backend", "color": "blue" }
```

### `PATCH /api/work/labels`
Body:
```json
{ "id": "label-id", "patch": { "name": "API", "color": "purple" } }
```

### `DELETE /api/work/labels`
Body:
```json
{ "id": "label-id" }
```

### `GET /api/work/sprints?workspaceId=...`
### `POST /api/work/sprints`
Body:
```json
{ "workspaceId": "...", "name": "Sprint 1", "goal": "optional" }
```

### `PATCH /api/work/sprints`
Body:
```json
{ "id": "sprint-id", "patch": { "name": "Sprint 2" } }
```

### `DELETE /api/work/sprints`
Body:
```json
{ "id": "sprint-id" }
```

### `POST /api/work/sprints/start`
Body:
```json
{ "id": "sprint-id" }
```

### `POST /api/work/sprints/complete`
Body:
```json
{ "id": "sprint-id", "moveUnfinishedToBacklog": true }
```

### `POST /api/work/move-card`
Body:
```json
{ "cardId": "...", "targetColumnId": "...", "targetIndex": 0 }
```

## Goals

### `GET /api/goals`
Response:
```json
{ "goals": [Goal] }
```

### `POST /api/goals`
Body:
```json
{
  "title": "Mục tiêu Q2",
  "description": "optional",
  "deadline": "YYYY-MM-DD",
  "steps": [{ "title": "Bước 1", "done": false }]
}
```

### `PATCH /api/goals`
Body:
```json
{
  "id": "goal-id",
  "patch": {
    "title": "Tên mới",
    "completed": false,
    "steps": [{ "id": "step-id", "title": "step", "done": true }]
  }
}
```

### `DELETE /api/goals`
Body:
```json
{ "id": "goal-id" }
```

## Focus

### `GET /api/focus/settings`
Response:
```json
{ "settings": { "workMinutes": 25, "breakMinutes": 5 } }
```

### `POST /api/focus/settings`
Body:
```json
{ "workMinutes": 30, "breakMinutes": 10 }
```

### `PATCH /api/focus/settings`
Body:
```json
{ "patch": { "workMinutes": 45 } }
```

### `GET /api/focus/sessions`
Response:
```json
{ "sessions": [PomodoroSession] }
```

### `POST /api/focus/sessions`
Body:
```json
{ "minutes": 25, "date": "optional ISO string" }
```

## Error shape

Validation errors return:
```json
{ "error": "<details>" }
```
with HTTP `400`.

Not found returns:
```json
{ "error": "... not found" }
```
with HTTP `404`.

## Live Updates

### `GET /api/live/changes?domains=finance,calendar`
- SSE stream for realtime data change notifications.
- Event `change` payload:
```json
{ "domains": ["finance"], "key": "ellie:transactions", "at": "2026-04-20T10:00:00.000Z" }
```
