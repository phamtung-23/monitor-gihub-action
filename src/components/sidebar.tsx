"use client";

import { useEffect, useState } from "react";
import { signOutAction } from "@/app/actions";
import { NavLinks } from "@/components/nav-links";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { repoDotClass } from "@/components/repo-badge";
import { RocketEarthIcon } from "@/components/rocket-earth-icon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "monitor.sidebar.collapsed";

type Props = {
  repos: string[];
  user: { name?: string | null; image?: string | null };
};

/** Label that fades + collapses horizontally with the sidebar */
function FadeLabel({
  collapsed,
  className,
  children,
}: {
  collapsed: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "overflow-hidden whitespace-nowrap transition-opacity duration-200",
        collapsed ? "w-0 opacity-0" : "opacity-100",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Sidebar({ repos, user }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  // Enable the width transition only after mount so a stored collapsed state
  // doesn't animate shut on page load
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r bg-card md:flex",
        mounted && "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Floating expand/collapse handle on the border */}
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-4 z-30 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "size-3.5 transition-transform duration-300",
            collapsed && "rotate-180"
          )}
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b",
          collapsed ? "justify-center px-2" : "gap-2 px-4"
        )}
      >
        <RocketEarthIcon className="size-8 shrink-0" />
        <FadeLabel collapsed={collapsed} className="text-sm font-semibold">
          Deploy Monitor
        </FadeLabel>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden p-3">
        <NavLinks collapsed={collapsed} />

        <div>
          <p
            className={cn(
              "mb-2 overflow-hidden whitespace-nowrap px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-all duration-200",
              collapsed ? "h-0 opacity-0" : "opacity-100"
            )}
          >
            Repositories
          </p>
          <ul className="flex flex-col gap-0.5">
            {repos.map((repo) => (
              <li key={repo}>
                <a
                  href={`https://github.com/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={repo}
                  className={cn(
                    "flex items-center rounded-md py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
                    collapsed ? "justify-center px-2" : "gap-2.5 px-3"
                  )}
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${repoDotClass(repo)}`}
                  />
                  <FadeLabel collapsed={collapsed} className="font-mono text-xs">
                    {repo.split("/")[1] ?? repo}
                  </FadeLabel>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t p-3">
        <NotificationsToggle collapsed={collapsed} />
        <div
          className={cn(
            "flex items-center",
            collapsed ? "flex-col gap-2" : "gap-2.5 px-1"
          )}
        >
          <Avatar className="size-7 shrink-0">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate text-sm">{user.name}</span>
          )}
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
    </aside>
  );
}
