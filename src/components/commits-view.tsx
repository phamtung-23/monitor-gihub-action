"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { timeAgo } from "@/lib/format";
import type { Commit } from "@/lib/github";
import { hashCode } from "@/components/repo-badge";
import { cn } from "@/lib/utils";
import { LoadMoreButton } from "@/components/load-more-button";
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

const ALL_BRANCHES = "__all__";

type BranchData = { defaultBranch: string; branches: string[] };
type CommitsData = { commits: Commit[] };

// Stable color per branch name — same branch always gets the same color
const BRANCH_PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
];

function branchBadgeClass(branch: string): string {
  return BRANCH_PALETTE[hashCode(branch) % BRANCH_PALETTE.length];
}

function CommitItem({ commit }: { commit: Commit }) {
  return (
    // The message link is stretched over the card; the avatar sits above it
    <div className="group relative flex w-72 shrink-0 flex-col gap-1.5 rounded-lg border bg-card p-3 transition-colors hover:bg-accent md:w-auto md:shrink">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {commit.author ? (
            <span className="relative z-10">
              <UserHoverCard
                login={commit.author.login}
                avatarUrl={commit.author.avatarUrl}
                className="size-5"
              />
            </span>
          ) : null}
          <span className="truncate text-xs text-muted-foreground">
            {commit.author?.login ?? commit.authorName}
          </span>
        </div>
        <Badge variant="outline" className="shrink-0 font-mono text-xs">
          {commit.sha.slice(0, 7)}
        </Badge>
      </div>
      <a
        href={commit.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="line-clamp-2 text-sm font-medium before:absolute before:inset-0 group-hover:underline"
      >
        {commit.message}
      </a>
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">
          {commit.date ? timeAgo(commit.date) : ""}
        </span>
        <Badge
          className={cn(
            "max-w-44 shrink truncate font-mono text-[10px]",
            branchBadgeClass(commit.branch)
          )}
          title={commit.branch}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-2.5 shrink-0"
          >
            <line x1="6" x2="6" y1="3" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
          <span className="truncate">{commit.branch}</span>
        </Badge>
      </div>
    </div>
  );
}

/** All-branches mode: one merged fetch, paginated client-side */
function AllBranchesList({
  repo,
  onUpdated,
}: {
  repo: string;
  onUpdated: (date: Date) => void;
}) {
  const [visible, setVisible] = useState(10);
  const { data, error, isLoading } = useSWR<CommitsData>(
    `/api/commits?repo=${encodeURIComponent(repo)}&all=1`,
    fetcher,
    {
      refreshInterval: 15_000,
      revalidateOnFocus: true,
      onSuccess: () => onUpdated(new Date()),
    }
  );

  const commits = data?.commits ?? [];

  return (
    <CommitListShell
      commits={commits.slice(0, visible)}
      error={!!error}
      isLoading={isLoading}
      hasMore={commits.length > visible}
      loadingMore={false}
      onLoadMore={() => setVisible((v) => v + 10)}
    />
  );
}

/** Single-branch mode: real pagination against the GitHub API */
function BranchList({
  repo,
  branch,
  onUpdated,
}: {
  repo: string;
  branch: string;
  onUpdated: (date: Date) => void;
}) {
  const params = new URLSearchParams({ repo, branch, page: "1" });
  const { data, error, isLoading } = useSWR<CommitsData>(
    `/api/commits?${params}`,
    fetcher,
    {
      refreshInterval: 15_000,
      revalidateOnFocus: true,
      onSuccess: () => onUpdated(new Date()),
    }
  );

  const [extra, setExtra] = useState<Commit[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [exhausted, setExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const moreParams = new URLSearchParams({
        repo,
        branch,
        page: String(nextPage),
      });
      const res = await fetch(`/api/commits?${moreParams}`);
      if (!res.ok) throw new Error();
      const more: CommitsData = await res.json();
      if (more.commits.length < 10) setExhausted(true);
      setExtra((prev) => [...prev, ...more.commits]);
      setNextPage((p) => p + 1);
    } catch {
      // keep the button — user can retry
    } finally {
      setLoadingMore(false);
    }
  }

  const firstPage = data?.commits ?? [];
  const seen = new Set(firstPage.map((c) => c.sha));
  const commits = [...firstPage, ...extra.filter((c) => !seen.has(c.sha))];

  return (
    <CommitListShell
      commits={commits}
      error={!!error}
      isLoading={isLoading}
      hasMore={firstPage.length >= 10 && !exhausted}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
    />
  );
}

function CommitListShell({
  commits,
  error,
  isLoading,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  commits: Commit[];
  error: boolean;
  isLoading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    /* Mobile: items scroll horizontally. md+: vertical list. */
    <CardContent className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
      {error && (
        <p className="w-full shrink-0 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Failed to load commits.
        </p>
      )}
      {isLoading &&
        Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-72 shrink-0 md:w-full" />
        ))}
      {!isLoading && !error && commits.length === 0 && (
        <p className="w-full shrink-0 py-6 text-center text-sm text-muted-foreground">
          No commits found.
        </p>
      )}
      {commits.map((commit) => (
        <CommitItem key={commit.sha} commit={commit} />
      ))}
      {hasMore && (
        <LoadMoreButton
          loading={loadingMore}
          onClick={onLoadMore}
          className="w-28 shrink-0 self-center md:w-full"
        />
      )}
    </CardContent>
  );
}

function RepoColumn({
  repo,
  onUpdated,
}: {
  repo: string;
  onUpdated: (date: Date) => void;
}) {
  const shortName = repo.split("/")[1] ?? repo;
  const { data: branchData } = useSWR<BranchData>(
    `/api/branches?repo=${encodeURIComponent(repo)}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const [selected, setSelected] = useState<string>(ALL_BRANCHES);

  return (
    <Card className="flex w-full min-w-0 flex-col bg-muted/50 md:min-w-80 md:flex-1">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-mono">{shortName}</span>
        </CardTitle>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger size="sm" className="w-full bg-background">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5 shrink-0 text-muted-foreground"
            >
              <line x1="6" x2="6" y1="3" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <span className="min-w-0 flex-1 truncate text-left font-mono text-xs">
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_BRANCHES} className="text-xs font-medium">
              All branches
            </SelectItem>
            {(branchData?.branches ?? []).map((name) => (
              <SelectItem key={name} value={name} className="font-mono text-xs">
                {name}
                {name === branchData?.defaultBranch && (
                  <span className="text-muted-foreground"> (default)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      {/* Re-mount on branch change so pagination state resets */}
      {selected === ALL_BRANCHES ? (
        <AllBranchesList key={ALL_BRANCHES} repo={repo} onUpdated={onUpdated} />
      ) : (
        <BranchList
          key={selected}
          repo={repo}
          branch={selected}
          onUpdated={onUpdated}
        />
      )}
    </Card>
  );
}

export function CommitsView({ repos }: { repos: string[] }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b bg-background/90 px-4 py-2 backdrop-blur md:-mx-6 md:-mt-6 md:h-14 md:px-6 md:py-0">
        <h1 className="text-lg font-semibold">Commits</h1>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : "Auto-refreshes every 15s"}
          </span>
          <RefreshButton prefix="/api/commits" />
        </div>
      </div>

      {/* Mobile: repos stack vertically. md+: kanban columns with horizontal scroll. */}
      <div className="-m-1 flex flex-col gap-4 p-1 pb-2 md:flex-row md:items-start md:overflow-x-auto">
        {repos.map((repo) => (
          <RepoColumn key={repo} repo={repo} onUpdated={setLastUpdated} />
        ))}
      </div>
    </div>
  );
}
