"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { timeAgo } from "@/lib/format";
import type { PullRequest, RepoError } from "@/lib/github";
import { RefreshButton } from "@/components/refresh-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Data = { pullRequests: PullRequest[]; errors: RepoError[] };

function PullRequestItem({ pr }: { pr: PullRequest }) {
  return (
    <a
      href={pr.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-1.5 rounded-lg border p-3 transition-colors hover:bg-accent"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {pr.author && (
            <Avatar className="size-5 shrink-0">
              <AvatarImage src={pr.author.avatarUrl} alt={pr.author.login} />
              <AvatarFallback>
                {pr.author.login[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="truncate text-xs text-muted-foreground">
            #{pr.number} · {pr.author?.login ?? "unknown"}
          </span>
        </div>
        {pr.draft && (
          <Badge variant="secondary" className="shrink-0">
            Draft
          </Badge>
        )}
      </div>
      <p className="line-clamp-2 text-sm font-medium group-hover:underline">
        {pr.title}
      </p>
      <p className="truncate font-mono text-xs text-muted-foreground">
        {pr.headRef} → {pr.baseRef}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          updated {timeAgo(pr.updatedAt)}
        </span>
        {pr.requestedReviewers.length > 0 && (
          <div className="flex shrink-0 -space-x-2" title="Requested reviewers">
            {pr.requestedReviewers.slice(0, 3).map((r) => (
              <Avatar key={r.login} className="size-5 border-2 border-background">
                <AvatarImage src={r.avatarUrl} alt={r.login} />
                <AvatarFallback>{r.login[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
      </div>
    </a>
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
    <Card className="flex min-w-0 flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-mono">{shortName}</span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
          <p className="py-6 text-center text-sm text-muted-foreground">
            No open pull requests. 🎉
          </p>
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
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Pull Requests</h1>
        {total > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
            pullRequests={data?.pullRequests.filter((p) => p.repo === repo) ?? []}
            error={data?.errors.find((e) => e.repo === repo)}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
