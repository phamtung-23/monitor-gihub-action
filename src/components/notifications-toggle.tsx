"use client";

import { useEffect, useState } from "react";
import {
  NOTIFICATIONS_PREF_KEY,
  notificationsEnabled,
  notificationsSupported,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";

export function NotificationsToggle() {
  // null until mounted — avoids SSR/client mismatch
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    setEnabled(notificationsEnabled());
    setDenied(notificationsSupported() && Notification.permission === "denied");
  }, []);

  async function toggle() {
    if (enabled) {
      localStorage.setItem(NOTIFICATIONS_PREF_KEY, "off");
      setEnabled(false);
      return;
    }
    if (!notificationsSupported()) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem(NOTIFICATIONS_PREF_KEY, "on");
      setEnabled(true);
      new Notification("Deploy Monitor", {
        body: "Notifications enabled — you'll hear about new & merged PRs 🎉",
      });
    } else {
      setDenied(permission === "denied");
    }
  }

  if (enabled === null) return null;

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        className="w-full justify-start gap-2.5 px-3 text-muted-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
          {enabled ? null : <line x1="2" x2="22" y1="2" y2="22" />}
        </svg>
        Notifications {enabled ? "on" : "off"}
        {enabled && (
          <span className="ml-auto size-1.5 rounded-full bg-emerald-500" />
        )}
      </Button>
      {denied && (
        <p className="px-3 text-xs text-muted-foreground">
          Blocked by the browser — allow notifications for this site in your
          browser settings.
        </p>
      )}
    </div>
  );
}
