"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { timeAgo } from "@/lib/format";
import type { PullRequest, PullRequestState, RepoError } from "@/lib/github";
import { ClosePrButton } from "@/components/close-pr-button";
import { LoadMoreButton } from "@/components/load-more-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { MergeButton } from "@/components/merge-button";
import { RefreshButton } from "@/components/refresh-button";
import { UserHoverCard } from "@/components/user-hover-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          {pr.state === "closed" &&
            (pr.mergedAt ? (
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                Merged
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                Closed
              </Badge>
            ))}
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
          {pr.state === "open" && (
            <>
              <ClosePrButton
                repo={pr.repo}
                number={pr.number}
                title={pr.title}
              />
              {!pr.draft && (
                <MergeButton
                  repo={pr.repo}
                  number={pr.number}
                  title={pr.title}
                  hasConflicts={pr.mergeable === "CONFLICTING"}
                />
              )}
            </>
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
  state,
}: {
  repo: string;
  pullRequests: PullRequest[];
  error?: RepoError;
  isLoading: boolean;
  state: PullRequestState;
}) {
  // Older pages fetched on demand; the polled first page stays live
  const [extra, setExtra] = useState<PullRequest[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [exhausted, setExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        repo,
        page: String(nextPage),
        state,
      });
      const res = await fetch(`/api/pull-requests/page?${params}`);
      if (!res.ok) throw new Error();
      const data: { pullRequests: PullRequest[] } = await res.json();
      if (data.pullRequests.length < 10) setExhausted(true);
      setExtra((prev) => [...prev, ...data.pullRequests]);
      setNextPage((p) => p + 1);
    } catch {
      // keep the button — user can retry
    } finally {
      setLoadingMore(false);
    }
  }

  // Dedupe: a PR update can push an item from the live page 1 into page 2
  const seen = new Set(pullRequests.map((p) => p.id));
  const allPulls = [...pullRequests, ...extra.filter((p) => !seen.has(p.id))];

  const shortName = repo.split("/")[1] ?? repo;

  return (
    <Card className="flex min-w-80 flex-1 flex-col bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-mono">{shortName}</span>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {allPulls.length}
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
        {!isLoading && !error && allPulls.length === 0 && (
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
            <p className="text-sm">No {state} pull requests.</p>
          </div>
        )}
        {allPulls.map((pr) => (
          <PullRequestItem key={pr.id} pr={pr} />
        ))}
        {pullRequests.length >= 10 && !exhausted && (
          <LoadMoreButton loading={loadingMore} onClick={loadMore} />
        )}
      </CardContent>
    </Card>
  );
}

export function PullsView({ repos }: { repos: string[] }) {
  const [state, setState] = useState<PullRequestState>("open");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // "open" keeps the plain key so the cache is shared with the sidebar
  // badge and the notifications watcher
  const swrKey =
    state === "open" ? "/api/pull-requests" : "/api/pull-requests?state=closed";
  const { data, error, isLoading } = useSWR<Data>(swrKey, fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    onSuccess: () => setLastUpdated(new Date()),
  });
  // The header badge always shows the OPEN count regardless of the active tab
  // (same key as the sidebar badge — deduplicated, no extra request)
  const { data: openData } = useSWR<Data>("/api/pull-requests", fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  });

  const openTotal = openData?.pullRequests.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:-mx-6 md:-mt-6 md:px-6">
        <h1 className="text-lg font-semibold">Pull Requests</h1>
        {openTotal > 0 && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {openTotal} open
          </span>
        )}
        <Select
          value={state}
          onValueChange={(value) => setState(value as PullRequestState)}
        >
          <SelectTrigger
            size="sm"
            className={
              state === "open"
                ? "w-28 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "w-28 border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
            }
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">
              <span className="size-2 rounded-full bg-emerald-500" />
              Open
            </SelectItem>
            <SelectItem value="closed">
              <span className="size-2 rounded-full bg-purple-500" />
              Closed
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : "Auto-refreshes every 15s"}
          </span>
          <RefreshButton keys={[swrKey]} />
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
            key={`${repo}-${state}`}
            repo={repo}
            pullRequests={data?.pullRequests.filter((p) => p.repo === repo) ?? []}
            error={data?.errors.find((e) => e.repo === repo)}
            isLoading={isLoading}
            state={state}
          />
        ))}
      </div>
    </div>
  );
}
