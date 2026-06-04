// Client-side helpers for native notifications, displayed via service worker
// (more reliable than the `new Notification()` constructor, which some
// Chrome/macOS builds silently drop).

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

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js");
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function showNotification(
  title: string,
  body: string,
  url: string,
  tag: string
) {
  if (!notificationsEnabled()) return;

  const options: NotificationOptions = {
    body,
    tag,
    icon: "/icon.png",
    data: { url },
  };

  const registration = await ensureServiceWorker();
  if (registration) {
    await registration.showNotification(title, options);
    return;
  }

  // Fallback for browsers without service worker support
  const n = new Notification(title, options);
  n.onclick = () => {
    window.focus();
    window.open(url, "_blank", "noopener,noreferrer");
    n.close();
  };
}
