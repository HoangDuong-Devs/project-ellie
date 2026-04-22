import {
  useInAppBudgetWatcher,
  useInAppDailyDigestWatcher,
  useInAppFocusWatcher,
  useInAppGoalWatcher,
  useInAppReminderWatcher,
  useInAppTransactionWatcher,
} from "@/hooks/useNotifications";
import type { NotificationWatcherFeed } from "@/hooks/useNotificationWatcherFeed";

export function useInAppNotificationWatchers(feed: NotificationWatcherFeed, enabled: boolean) {
  useInAppReminderWatcher(feed.calendarItems, enabled);
  useInAppBudgetWatcher(feed.transactions, feed.budget, enabled);
  useInAppTransactionWatcher(feed.transactions, enabled);
  useInAppGoalWatcher(feed.goals, enabled);
  useInAppFocusWatcher(feed.focusSessions, enabled);
  useInAppDailyDigestWatcher(feed.calendarItems, enabled);
}
