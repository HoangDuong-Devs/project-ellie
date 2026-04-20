# Ellie Assistant Contract Map

This document defines the practical assistant-facing surface for Project Ellie.
It translates the local API contract into stable domain actions that an assistant or future skill can call.

## Principles

- Ellie is the source of truth.
- The assistant should prefer API clients and documented local API routes over direct storage mutation.
- Responses should stay domain-shaped and machine-friendly.
- UI convenience hooks may remain during migration, but assistant automation should target the API layer.

## Domain Skills

## 1. ellie-finance

Primary purpose: daily finance logging, reporting, and savings goal tracking.

### Read actions
- list transactions
  - `GET /api/finance/transactions`
- get monthly summary
  - `GET /api/finance/summary?year=<year>&month=<zero-based-month>`
- list savings goals
  - `GET /api/finance/savings-goals`

### Write actions
- create transaction
  - `POST /api/finance/transactions`
- update transaction
  - `PATCH /api/finance/transactions`
- delete transaction
  - `DELETE /api/finance/transactions`
- create savings goal
  - `POST /api/finance/savings-goals`
- update savings goal
  - `PATCH /api/finance/savings-goals`
- delete savings goal
  - `DELETE /api/finance/savings-goals`

### Recommended assistant commands
- add expense/income
- show this month spending
- show cashflow summary
- list savings goals
- create savings goal
- adjust savings goal
- remove mistaken transaction

## 2. ellie-calendar

Primary purpose: event planning, schedule management, and calendar structure.

### Read actions
- list calendars
  - `GET /api/calendar/calendars`
- list events
  - `GET /api/calendar/events`
- list todos
  - `GET /api/calendar/todos`

### Write actions
- create/update event
  - `POST /api/calendar/events`
- patch event
  - `PATCH /api/calendar/events`
- delete event
  - `DELETE /api/calendar/events`
- create calendar
  - `POST /api/calendar/calendars`
- patch calendar
  - `PATCH /api/calendar/calendars`
- delete calendar
  - `DELETE /api/calendar/calendars`
- create todo
  - `POST /api/calendar/todos`
- patch todo
  - `PATCH /api/calendar/todos`
- delete todo
  - `DELETE /api/calendar/todos`

### Recommended assistant commands
- create event
- move event
- cancel event
- list upcoming events
- create todo
- mark todo done
- clean up completed todos

## 3. ellie-work

Primary purpose: project tracking, kanban, backlog, and sprint operations.

### Read actions
- get full work data
  - `GET /api/work/data`
- optional domain reads
  - `GET /api/work/workspaces`
  - `GET /api/work/cards`
  - `GET /api/work/columns`
  - `GET /api/work/labels`
  - `GET /api/work/sprints`

### Write actions
- create/update/delete workspace
  - `/api/work/workspaces`
- create/update/delete card
  - `/api/work/cards`
- move card
  - `POST /api/work/move-card`
- create/update/delete column
  - `/api/work/columns`
- create/update/delete label
  - `/api/work/labels`
- create/update/delete sprint
  - `/api/work/sprints`
- start sprint
  - `POST /api/work/sprints/start`
- complete sprint
  - `POST /api/work/sprints/complete`

### Recommended assistant commands
- list active projects
- create work card
- move card to another column
- rename column
- create sprint
- start sprint
- complete sprint
- summarize workspace status

## 4. ellie-goals

Primary purpose: personal goals and milestone tracking.

### Read actions
- list goals
  - `GET /api/goals`

### Write actions
- create goal
  - `POST /api/goals`
- patch goal
  - `PATCH /api/goals`
- delete goal
  - `DELETE /api/goals`

### Recommended assistant commands
- create goal
- update goal steps
- mark goal completed
- show active goals
- remove abandoned goal

## 5. ellie-focus

Primary purpose: pomodoro/focus preferences and session tracking.

### Read actions
- get focus settings
  - `GET /api/focus/settings`
- list focus sessions
  - `GET /api/focus/sessions`

### Write actions
- create or replace settings
  - `POST /api/focus/settings`
- patch settings
  - `PATCH /api/focus/settings`
- create focus session
  - `POST /api/focus/sessions`

### Recommended assistant commands
- show focus settings
- update pomodoro timing
- log focus session
- summarize focus streak or recent focus activity

## Assistant integration rule

When an assistant action can be fulfilled through Ellie APIs, prefer:

1. API route
2. API client wrapper
3. storage mutation only as a migration fallback

## Migration rule from expenses

- New finance operations should target Ellie finance APIs.
- The old `expenses` project should be treated as legacy/migration tooling only.
- Delete or archive legacy tooling only after the user confirms the exact removal scope.
