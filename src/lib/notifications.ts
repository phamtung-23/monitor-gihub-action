// Client-side helpers for native (Web Notifications API) notifications

export const NOTIFICATIONS_PREF_KEY = "monitor.notifications";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsEnabled(): boolean {
  return (
    notificationsSupported() &&
    Notification.permission === "granted" &&
    localStorage.getItem(NOTIFICATIONS_PREF_KEY) === "on"
  );
}

export function showNotification(
  title: string,
  body: string,
  url: string,
  tag: string
) {
  if (!notificationsEnabled()) return;
  const n = new Notification(title, { body, tag, icon: "/favicon.ico" });
  n.onclick = () => {
    window.focus();
    window.open(url, "_blank", "noopener,noreferrer");
    n.close();
  };
}
