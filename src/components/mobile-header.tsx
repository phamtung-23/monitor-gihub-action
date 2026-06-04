"use client";

import { useState } from "react";
import { signOutAction } from "@/app/actions";
import { NavLinks } from "@/components/nav-links";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { RocketEarthIcon } from "@/components/rocket-earth-icon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  user: { name?: string | null; image?: string | null };
};

/** Top bar shown below md — the sidebar is hidden on mobile */
export function MobileHeader({ user }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b md:hidden">
      <div className="flex items-center gap-2 p-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => setOpen((o) => !o)}
          title={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </Button>
        <RocketEarthIcon className="size-7 shrink-0" />
        <span className="text-sm font-semibold">Deploy Monitor</span>
        <div className="ml-auto flex items-center gap-1.5">
          <NotificationsToggle collapsed />
          <Avatar className="size-7">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              title="Sign out"
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </Button>
          </form>
        </div>
      </div>
      {open && (
        <nav className="border-t p-3">
          <NavLinks onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </header>
  );
}
