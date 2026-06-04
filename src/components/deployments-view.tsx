"use client";

import { useState } from "react";
import { LoadMoreButton } from "@/components/load-more-button";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { timeAgo, formatDuration } from "@/lib/format";
import { isRunning } from "@/lib/status";
import type { WorkflowRun, RepoError } from "@/lib/github";
import { StatusBadge } from "@/components/status-badge";
import { RefreshButton } from "@/components/refresh-button";
import { UserHoverCard } from "@/components/user-hover-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Data = { runs: WorkflowRun[]; errors: RepoError[] };

function RunItem({ run }: { run: WorkflowRun }) {
  return (
    // The title link is stretched over the card; the avatar sits above it
    // (z-10) so its hover card doesn't fight the link's hover state
    <div className="group relative flex flex-col gap-1.5 rounded-lg border bg-card p-3 transition-colors hover:bg-accent">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={run.status} conclusion={run.conclusion} />
        {run.actor && (
          <span className="relative z-10">
            <UserHoverCard
              login={run.actor.login}
              avatarUrl={run.actor.avatarUrl}
              className="size-5"
            />
          </span>
        )}
      </div>
      <a
        href={run.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate text-sm font-medium before:absolute before:inset-0 group-hover:underline"
      >
        {run.displayTitle}
      </a>
      <p className="truncate text-xs text-muted-foreground">
        {run.workflowName} #{run.runNumber}
        {run.branch && (
          <>
            {" · "}
            <span className="font-mono">{run.branch}</span>
          </>
        )}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {timeAgo(run.createdAt)}
        {run.status === "completed" && run.runStartedAt && (
          <> · took {formatDuration(run.runStartedAt, run.updatedAt)}</>
        )}
      </p>
    </div>
  );
}

function RepoColumn({
  repo,
  runs,
  error,
  isLoading,
}: {
  repo: string;
  runs: WorkflowRun[];
  error?: RepoError;
  isLoading: boolean;
}) {
  // Older pages fetched on demand; the polled first page stays live
  const [extra, setExtra] = useState<WorkflowRun[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [exhausted, setExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ repo, page: String(nextPage) });
      const res = await fetch(`/api/workflow-runs/page?${params}`);
      if (!res.ok) throw new Error();
      const data: { runs: WorkflowRun[] } = await res.json();
      if (data.runs.length < 10) setExhausted(true);
      setExtra((prev) => [...prev, ...data.runs]);
      setNextPage((p) => p + 1);
    } catch {
      // keep the button — user can retry
    } finally {
      setLoadingMore(false);
    }
  }

  // Dedupe: a new run can push an item from the live page 1 into page 2
  const seen = new Set(runs.map((r) => r.id));
  const allRuns = [...runs, ...extra.filter((r) => !seen.has(r.id))];

  const runningCount = allRuns.filter((r) => isRunning(r.status)).length;
  const shortName = repo.split("/")[1] ?? repo;

  return (
    <Card className="flex min-w-80 flex-1 flex-col bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-mono">{shortName}</span>
          {runningCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
              {runningCount} running
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              idle
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error.message}
          </p>
        )}
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        {!isLoading && !error && allRuns.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No workflow runs.
          </p>
        )}
        {allRuns.map((run) => (
          <RunItem key={run.id} run={run} />
        ))}
        {runs.length >= 10 && !exhausted && (
          <LoadMoreButton loading={loadingMore} onClick={loadMore} />
        )}
      </CardContent>
    </Card>
  );
}

export function DeploymentsView({ repos }: { repos: string[] }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { data, error, isLoading } = useSWR<Data>("/api/workflow-runs", fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    onSuccess: () => setLastUpdated(new Date()),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:-mx-6 md:-mt-6 md:px-6">
        <h1 className="text-lg font-semibold">Deployments</h1>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : "Auto-refreshes every 15s"}
          </span>
          <RefreshButton keys={["/api/workflow-runs"]} />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load workflow runs.
        </p>
      )}

      {/* Few repos: columns stretch to fill. Many repos: horizontal scroll. */}
      <div className="-m-1 flex items-start gap-4 overflow-x-auto p-1 pb-2">
        {repos.map((repo) => (
          <RepoColumn
            key={repo}
            repo={repo}
            runs={data?.runs.filter((r) => r.repo === repo) ?? []}
            error={data?.errors.find((e) => e.repo === repo)}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
