"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  ensureServiceWorker,
  notificationsEnabled,
  showNotification,
} from "@/lib/notifications";
import type { PullRequest, RepoError } from "@/lib/github";

type Data = {
  pullRequests: PullRequest[];
  errors: RepoError[];
  repos: string[];
};

/**
 * Invisible component mounted in the dashboard layout. Rides the same SWR
 * poll as the PR views (deduplicated — no extra requests) and fires native
 * notifications when a PR is opened, merged, or closed.
 */
export function NotificationsWatcher() {
  const { data } = useSWR<Data>("/api/pull-requests", fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    // Keep polling while the tab is hidden/minimized — that's exactly when
    // native notifications matter (browser may throttle to ~1/min, still fine)
    refreshWhenHidden: true,
  });
  const prev = useRef<Map<number, PullRequest> | null>(null);

  // Register the service worker up-front so the first notification is instant
  useEffect(() => {
    if (notificationsEnabled()) ensureServiceWorker();
  }, []);

  useEffect(() => {
    if (!data) return;
    const current = new Map(data.pullRequests.map((pr) => [pr.id, pr]));
    const before = prev.current;
    prev.current = current;

    if (!before) return; // first load — nothing to compare against
    if (!notificationsEnabled()) return;

    const monitoredRepos = new Set(data.repos);

    for (const [id, pr] of current) {
      if (!before.has(id)) {
        showNotification(
          `🔀 New PR · ${pr.repo.split("/")[1]}`,
          `#${pr.number} ${pr.title}\nby ${pr.author?.login ?? "unknown"}`,
          pr.htmlUrl,
          `pr-open-${id}`
        );
      }
    }

    for (const [id, pr] of before) {
      // Skip repos the user just unselected — those PRs vanish without closing
      if (current.has(id) || !monitoredRepos.has(pr.repo)) continue;
      const params = new URLSearchParams({
        repo: pr.repo,
        number: String(pr.number),
      });
      fetch(`/api/pr-status?${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((status: { merged: boolean } | null) => {
          showNotification(
            status?.merged
              ? `🎉 PR merged · ${pr.repo.split("/")[1]}`
              : `❌ PR closed · ${pr.repo.split("/")[1]}`,
            `#${pr.number} ${pr.title}`,
            pr.htmlUrl,
            `pr-done-${id}`
          );
        })
        .catch(() => {});
    }
  }, [data]);

  return null;
}
