"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { timeAgo } from "@/lib/format";
import type { PullRequest, RepoError } from "@/lib/github";
import { ClosePrButton } from "@/components/close-pr-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { MergeButton } from "@/components/merge-button";
import { RefreshButton } from "@/components/refresh-button";
import { UserHoverCard } from "@/components/user-hover-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Data = { pullRequests: PullRequest[]; errors: RepoError[] };

function PullRequestItem({ pr }: { pr: PullRequest }) {
  return (
    // The title link is stretched over the card; avatars sit above it (z-10)
    // so their hover cards don't fight the link's hover state
    <div className="group relative flex flex-col gap-1.5 rounded-lg border bg-card p-3 transition-colors hover:bg-accent">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {pr.author && (
            <span className="relative z-10">
              <UserHoverCard
                login={pr.author.login}
                avatarUrl={pr.author.avatarUrl}
                className="size-5"
              />
            </span>
          )}
          <span className="truncate text-xs text-muted-foreground">
            #{pr.number} · {pr.author?.login ?? "unknown"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {pr.mergeable === "CONFLICTING" && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              Conflicts
            </Badge>
          )}
          {pr.mergeable === "MERGEABLE" && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Ready to merge
            </Badge>
          )}
          {pr.draft && <Badge variant="secondary">Draft</Badge>}
        </div>
      </div>
      <a
        href={pr.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="line-clamp-2 text-sm font-medium before:absolute before:inset-0 group-hover:underline"
      >
        {pr.title}
      </a>
      <p className="truncate font-mono text-xs text-muted-foreground">
        {pr.headRef} → {pr.baseRef}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          updated {timeAgo(pr.updatedAt)}
        </span>
        <div className="relative z-10 flex shrink-0 items-center gap-2">
          {pr.requestedReviewers.length > 0 && (
            <div className="flex -space-x-2" title="Requested reviewers">
              {pr.requestedReviewers.slice(0, 3).map((r) => (
                <UserHoverCard
                  key={r.login}
                  login={r.login}
                  avatarUrl={r.avatarUrl}
                  className="size-5 border-2 border-background"
                />
              ))}
            </div>
          )}
          <CopyLinkButton url={pr.htmlUrl} />
          <ClosePrButton repo={pr.repo} number={pr.number} title={pr.title} />
          {!pr.draft && (
            <MergeButton
              repo={pr.repo}
              number={pr.number}
              title={pr.title}
              hasConflicts={pr.mergeable === "CONFLICTING"}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RepoColumn({
  repo,
  pullRequests,
  error,
  isLoading,
}: {
  repo: string;
  pullRequests: PullRequest[];
  error?: RepoError;
  isLoading: boolean;
}) {
  const shortName = repo.split("/")[1] ?? repo;

  return (
    <Card className="flex min-w-80 flex-1 flex-col bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-mono">{shortName}</span>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {pullRequests.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error.message}
          </p>
        )}
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        {!isLoading && !error && pullRequests.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6"
            >
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
              <line x1="6" x2="6" y1="9" y2="21" />
            </svg>
            <p className="text-sm">No open pull requests.</p>
          </div>
        )}
        {pullRequests.map((pr) => (
          <PullRequestItem key={pr.id} pr={pr} />
        ))}
      </CardContent>
    </Card>
  );
}

export function PullsView({ repos }: { repos: string[] }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { data, error, isLoading } = useSWR<Data>("/api/pull-requests", fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    onSuccess: () => setLastUpdated(new Date()),
  });

  const total = data?.pullRequests.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:-mx-6 md:-mt-6 md:px-6">
        <h1 className="text-lg font-semibold">Pull Requests</h1>
        {total > 0 && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {total} open
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : "Auto-refreshes every 15s"}
          </span>
          <RefreshButton keys={["/api/pull-requests"]} />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load pull requests.
        </p>
      )}

      {/* Few repos: columns stretch to fill. Many repos: horizontal scroll. */}
      <div className="-m-1 flex items-start gap-4 overflow-x-auto p-1 pb-2">
        {repos.map((repo) => (
          <RepoColumn
            key={repo}
            repo={repo}
            pullRequests={data?.pullRequests.filter((p) => p.repo === repo) ?? []}
            error={data?.errors.find((e) => e.repo === repo)}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
