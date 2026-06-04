import { Octokit } from "octokit";
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
  /** UNKNOWN while GitHub is still computing, or when the lookup failed */
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
};

export type RepoError = { repo: string; message: string };

/** Parse "owner/repo" full names, skipping malformed entries */
function parseRepos(fullNames: string[]) {
  return fullNames
    .map((fullName) => {
      const [owner, repo] = fullName.split("/");
      return owner && repo ? { owner, repo, fullName } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "status" in err && err.status === 404) {
    return "Not found — check repo name & OAuth app access to the org";
  }
  return err instanceof Error ? err.message : String(err);
}

export async function getWorkflowRuns(
  token: string,
  repoFullNames: string[]
): Promise<{
  runs: WorkflowRun[];
  errors: RepoError[];
}> {
  const octokit = new Octokit({ auth: token });
  const repos = parseRepos(repoFullNames);

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

export async function getOpenPullRequests(
  token: string,
  repoFullNames: string[]
): Promise<{
  pullRequests: PullRequest[];
  errors: RepoError[];
}> {
  const octokit = new Octokit({ auth: token });
  const repos = parseRepos(repoFullNames);

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
          mergeable: "UNKNOWN" as const,
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

  // Conflict status isn't in the REST list endpoint — one GraphQL query
  // fetches `mergeable` for every open PR across all repos at once.
  if (pullRequests.length > 0) {
    try {
      const fields = repos
        .map(
          (r, i) =>
            `r${i}: repository(owner: ${JSON.stringify(r.owner)}, name: ${JSON.stringify(r.repo)}) {
              pullRequests(states: OPEN, first: 50) {
                nodes { number mergeable }
              }
            }`
        )
        .join("\n");
      const data = await octokit.graphql<
        Record<
          string,
          { pullRequests: { nodes: { number: number; mergeable: string }[] } } | null
        >
      >(`query { ${fields} }`);

      const byRepoAndNumber = new Map<string, string>();
      repos.forEach((r, i) => {
        data[`r${i}`]?.pullRequests.nodes.forEach((node) => {
          byRepoAndNumber.set(`${r.fullName}#${node.number}`, node.mergeable);
        });
      });
      for (const pr of pullRequests) {
        const state = byRepoAndNumber.get(`${pr.repo}#${pr.number}`);
        if (state === "MERGEABLE" || state === "CONFLICTING") {
          pr.mergeable = state;
        }
      }
    } catch {
      // Conflict info is best-effort — the list still renders without it
    }
  }

  return { pullRequests, errors };
}

export type GithubUser = {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  publicRepos: number;
  htmlUrl: string;
};

export async function getUser(
  token: string,
  username: string
): Promise<GithubUser> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.users.getByUsername({ username });
  return {
    login: data.login,
    name: data.name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    company: data.company,
    location: data.location,
    followers: data.followers,
    publicRepos: data.public_repos,
    htmlUrl: data.html_url,
  };
}

export type AccessibleRepo = {
  fullName: string;
  private: boolean;
  description: string | null;
  pushedAt: string | null;
};

/** Repos the token can access (own + collaborator + org member), most recently pushed first */
export async function listAccessibleRepos(
  token: string
): Promise<AccessibleRepo[]> {
  const octokit = new Octokit({ auth: token });
  const repos = [];
  // Cap at 3 pages (300 repos) to keep the picker snappy
  for (let page = 1; page <= 3; page++) {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      page,
      sort: "pushed",
      direction: "desc",
      affiliation: "owner,collaborator,organization_member",
    });
    repos.push(...data);
    if (data.length < 100) break;
  }

  return repos.map((r) => ({
    fullName: r.full_name,
    private: r.private,
    description: r.description,
    pushedAt: r.pushed_at ?? null,
  }));
}
