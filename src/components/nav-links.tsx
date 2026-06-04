"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { isRunning } from "@/lib/status";
import type { WorkflowRun, PullRequest, RepoError } from "@/lib/github";
import { cn } from "@/lib/utils";

type RunsData = { runs: WorkflowRun[]; errors: RepoError[] };
type PullsData = { pullRequests: PullRequest[]; errors: RepoError[] };

const ICONS = {
  deployments: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  pulls: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" x2="6" y1="9" y2="21" />
    </svg>
  ),
  settings: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

export function NavLinks({ horizontal = false }: { horizontal?: boolean }) {
  const pathname = usePathname();

  // Same SWR keys as the page views — deduplicated, no extra requests
  const { data: runsData } = useSWR<RunsData>("/api/workflow-runs", fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  });
  const { data: pullsData } = useSWR<PullsData>("/api/pull-requests", fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  });

  const runningCount =
    runsData?.runs.filter((r) => isRunning(r.status)).length ?? 0;
  const prCount = pullsData?.pullRequests.length ?? 0;

  const items = [
    {
      href: "/",
      label: "Deployments",
      icon: ICONS.deployments,
      badge:
        runningCount > 0 ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
            {runningCount}
          </span>
        ) : null,
    },
    {
      href: "/pulls",
      label: "Pull Requests",
      icon: ICONS.pulls,
      badge:
        prCount > 0 ? (
          <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {prCount}
          </span>
        ) : null,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: ICONS.settings,
      badge: null,
    },
  ];

  return (
    <nav className={cn("flex gap-1", horizontal ? "flex-row" : "flex-col")}>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              horizontal && "flex-1 justify-center",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
            {item.badge}
          </Link>
        );
      })}
    </nav>
  );
}
