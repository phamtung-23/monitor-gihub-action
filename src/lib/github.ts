import { Octokit } from "octokit";
import { getRepos } from "./config";
import { isRunning } from "./status";

export type WorkflowRun = {
  id: number;
  repo: string;
  workflowName: string;
  displayTitle: string;
  runNumber: number;
  branch: string | null;
  event: string;
  /** queued | in_progress | completed | waiting | pending | requested */
  status: string | null;
  /** success | failure | cancelled | skipped | timed_out | action_required | null */
  conclusion: string | null;
  actor: { login: string; avatarUrl: string } | null;
  createdAt: string;
  runStartedAt: string | null;
  updatedAt: string;
  htmlUrl: string;
};

export type PullRequest = {
  id: number;
  repo: string;
  number: number;
  title: string;
  author: { login: string; avatarUrl: string } | null;
  headRef: string;
  baseRef: string;
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  requestedReviewers: { login: string; avatarUrl: string }[];
  labels: { name: string; color: string }[];
};

export type RepoError = { repo: string; message: string };

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "status" in err && err.status === 404) {
    return "Not found — check repo name & OAuth app access to the org";
  }
  return err instanceof Error ? err.message : String(err);
}

export async function getWorkflowRuns(token: string): Promise<{
  runs: WorkflowRun[];
  errors: RepoError[];
}> {
  const octokit = new Octokit({ auth: token });
  const repos = getRepos();

  const results = await Promise.allSettled(
    repos.map(async ({ owner, repo, fullName }) => {
      const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: 10,
      });
      return data.workflow_runs.map(
        (run): WorkflowRun => ({
          id: run.id,
          repo: fullName,
          workflowName: run.name ?? "workflow",
          displayTitle: run.display_title,
          runNumber: run.run_number,
          branch: run.head_branch,
          event: run.event,
          status: run.status,
          conclusion: run.conclusion,
          actor: run.actor
            ? { login: run.actor.login, avatarUrl: run.actor.avatar_url }
            : null,
          createdAt: run.created_at,
          runStartedAt: run.run_started_at ?? null,
          updatedAt: run.updated_at,
          htmlUrl: run.html_url,
        })
      );
    })
  );

  const runs: WorkflowRun[] = [];
  const errors: RepoError[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") runs.push(...result.value);
    else errors.push({ repo: repos[i].fullName, message: errorMessage(result.reason) });
  });

  // Running runs first, then newest first
  runs.sort((a, b) => {
    const aRunning = isRunning(a.status) ? 1 : 0;
    const bRunning = isRunning(b.status) ? 1 : 0;
    if (aRunning !== bRunning) return bRunning - aRunning;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return { runs, errors };
}

export async function getOpenPullRequests(token: string): Promise<{
  pullRequests: PullRequest[];
  errors: RepoError[];
}> {
  const octokit = new Octokit({ auth: token });
  const repos = getRepos();

  const results = await Promise.allSettled(
    repos.map(async ({ owner, repo, fullName }) => {
      const { data } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "open",
        per_page: 50,
        sort: "updated",
        direction: "desc",
      });
      return data.map(
        (pr): PullRequest => ({
          id: pr.id,
          repo: fullName,
          number: pr.number,
          title: pr.title,
          author: pr.user
            ? { login: pr.user.login, avatarUrl: pr.user.avatar_url }
            : null,
          headRef: pr.head.ref,
          baseRef: pr.base.ref,
          draft: pr.draft ?? false,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          htmlUrl: pr.html_url,
          requestedReviewers: (pr.requested_reviewers ?? []).map((r) => ({
            login: r.login,
            avatarUrl: r.avatar_url,
          })),
          labels: (pr.labels ?? []).map((l) => ({
            name: l.name,
            color: l.color ?? "ededed",
          })),
        })
      );
    })
  );

  const pullRequests: PullRequest[] = [];
  const errors: RepoError[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") pullRequests.push(...result.value);
    else errors.push({ repo: repos[i].fullName, message: errorMessage(result.reason) });
  });

  pullRequests.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return { pullRequests, errors };
}
