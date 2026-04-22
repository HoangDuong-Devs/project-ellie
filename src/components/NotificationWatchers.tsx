import { useEffect } from "react";
import { requestNotificationPermission } from "@/hooks/useNotifications";
import { useInAppNotificationWatchers } from "@/hooks/useInAppNotificationWatchers";
import { useNotificationWatcherFeed } from "@/hooks/useNotificationWatcherFeed";

export function NotificationWatchers() {
  const { feed, ready } = useNotificationWatcherFeed();

  useInAppNotificationWatchers(feed, ready);

  // Ask once when the app runtime starts (if permission is still undecided).
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void requestNotificationPermission();
    }
  }, []);

  return null;
}
