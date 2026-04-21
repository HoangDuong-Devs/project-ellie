import type { Calendar, CalendarItem } from "@/types/calendar";
import type { Todo } from "@/types/schedule";
import { emitDataChanged } from "@/services/api-live-sync";

type EventsResponse = { items: CalendarItem[]; item?: CalendarItem };
type CalendarsResponse = { calendars: Calendar[]; calendar?: Calendar };
type TodosResponse = { todos: Todo[]; todo?: Todo };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || `Request failed: ${res.status}`);
  }
  return body as T;
}

export function listEvents() {
  return request<EventsResponse>("/api/calendar/events");
}

export function upsertEvent(item: Partial<CalendarItem> & Pick<CalendarItem, "title" | "startISO" | "endISO" | "calendarId">) {
  return request<EventsResponse>("/api/calendar/events", {
    method: "POST",
    body: JSON.stringify(item),
  }).then((res) => {
    emitDataChanged("calendar");
    return res;
  });
}

export function patchEvent(id: string, patch: Partial<CalendarItem>) {
  return request<EventsResponse>("/api/calendar/events", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("calendar");
    return res;
  });
}

export function deleteEvent(id: string) {
  return request<EventsResponse>("/api/calendar/events", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("calendar");
    return res;
  });
}

export function listCalendars() {
  return request<CalendarsResponse>("/api/calendar/calendars");
}

export function createCalendar(input: Pick<Calendar, "name" | "color"> & Partial<Pick<Calendar, "visible">>) {
  return request<CalendarsResponse>("/api/calendar/calendars", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((res) => {
    emitDataChanged("calendar");
    return res;
  });
}

export function patchCalendar(id: string, patch: Partial<Calendar>) {
  return request<CalendarsResponse>("/api/calendar/calendars", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("calendar");
    return res;
  });
}

export function deleteCalendar(id: string) {
  return request<CalendarsResponse>("/api/calendar/calendars", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("calendar");
    return res;
  });
}

export function listTodos() {
  return request<TodosResponse>("/api/calendar/todos");
}

export function createTodo(input: Pick<Todo, "title"> & Partial<Pick<Todo, "priority" | "dueDate" | "done">>) {
  return request<TodosResponse>("/api/calendar/todos", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((res) => {
    emitDataChanged("calendar");
    return res;
  });
}

export function patchTodo(id: string, patch: Partial<Todo>) {
  return request<TodosResponse>("/api/calendar/todos", {
    method: "PATCH",
    body: JSON.stringify({ id, patch }),
  }).then((res) => {
    emitDataChanged("calendar");
    return res;
  });
}

export function deleteTodo(id: string) {
  return request<TodosResponse>("/api/calendar/todos", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }).then((res) => {
    emitDataChanged("calendar");
    return res;
  });
}
