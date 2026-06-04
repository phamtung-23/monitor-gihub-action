"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { timeAgo, formatDuration } from "@/lib/format";
import { isRunning } from "@/lib/status";
import type { WorkflowRun, RepoError } from "@/lib/github";
import { StatusBadge } from "@/components/status-badge";
import { RefreshButton } from "@/components/refresh-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Data = { runs: WorkflowRun[]; errors: RepoError[] };

function RunItem({ run }: { run: WorkflowRun }) {
  return (
    <a
      href={run.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-1.5 rounded-lg border p-3 transition-colors hover:bg-accent"
    >
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={run.status} conclusion={run.conclusion} />
        {run.actor && (
          <Avatar className="size-5 shrink-0">
            <AvatarImage src={run.actor.avatarUrl} alt={run.actor.login} />
            <AvatarFallback>{run.actor.login[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <p className="truncate text-sm font-medium group-hover:underline">
        {run.displayTitle}
      </p>
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
    </a>
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
  const runningCount = runs.filter((r) => isRunning(r.status)).length;
  const shortName = repo.split("/")[1] ?? repo;

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-mono">{shortName}</span>
          {runningCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
              {runningCount} running
            </span>
          ) : (
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
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
        {!isLoading && !error && runs.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No workflow runs.
          </p>
        )}
        {runs.map((run) => (
          <RunItem key={run.id} run={run} />
        ))}
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
      <div className="flex flex-wrap items-center gap-3">
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

      <div
        className="grid items-start gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
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
