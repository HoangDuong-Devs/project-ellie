import { useCallback, useEffect, useState } from "react";
import { useDataAutoRefresh } from "@/services/api-live-sync";
import { listEvents, listTodos } from "@/services/calendar-api-client";
import { listTransactions, getMonthlyBudget } from "@/services/finance-api-client";
import { listGoals } from "@/services/goals-api-client";
import { listFocusSessions } from "@/services/focus-api-client";
import { DEFAULT_MONTHLY_BUDGET, type MonthlyBudget } from "@/services/finance-service";
import type { CalendarItem } from "@/types/calendar";
import type { Transaction } from "@/types/finance";
import type { Goal } from "@/types/goals";
import type { PomodoroSession } from "@/types/focus";
import type { Todo } from "@/types/schedule";

export type NotificationWatcherFeed = {
  calendarItems: CalendarItem[];
  transactions: Transaction[];
  budget: MonthlyBudget;
  goals: Goal[];
  focusSessions: PomodoroSession[];
  todos: Todo[];
};

const DEFAULT_FEED: NotificationWatcherFeed = {
  calendarItems: [],
  transactions: [],
  budget: DEFAULT_MONTHLY_BUDGET,
  goals: [],
  focusSessions: [],
  todos: [],
};

export function useNotificationWatcherFeed() {
  const [feed, setFeed] = useState<NotificationWatcherFeed>(DEFAULT_FEED);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const now = new Date();
    const [eventsRes, txRes, budgetRes, goalsRes, focusRes, todosRes] = await Promise.all([
      listEvents(),
      listTransactions(),
      getMonthlyBudget(now.getFullYear(), now.getMonth()),
      listGoals(),
      listFocusSessions(),
      listTodos(),
    ]);

    setFeed({
      calendarItems: eventsRes.items,
      transactions: txRes.transactions,
      budget: budgetRes.budget ?? DEFAULT_MONTHLY_BUDGET,
      goals: goalsRes.goals,
      focusSessions: focusRes.sessions,
      todos: todosRes.todos,
    });
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const now = new Date();
        const [eventsRes, txRes, budgetRes, goalsRes, focusRes, todosRes] = await Promise.all([
          listEvents(),
          listTransactions(),
          getMonthlyBudget(now.getFullYear(), now.getMonth()),
          listGoals(),
          listFocusSessions(),
          listTodos(),
        ]);

        if (!active) return;

        setFeed({
          calendarItems: eventsRes.items,
          transactions: txRes.transactions,
          budget: budgetRes.budget ?? DEFAULT_MONTHLY_BUDGET,
          goals: goalsRes.goals,
          focusSessions: focusRes.sessions,
          todos: todosRes.todos,
        });
        setReady(true);
      } catch {
        if (!active) return;
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useDataAutoRefresh(refresh, ["calendar", "finance", "goals", "focus"]);

  return { feed, ready, refresh };
}
