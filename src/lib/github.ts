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
  state: "open" | "closed";
  /** Set when a closed PR was merged (vs just closed) */
  mergedAt: string | null;
};

export type PullRequestState = "open" | "closed";

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

type RunData = Awaited<
  ReturnType<Octokit["rest"]["actions"]["listWorkflowRunsForRepo"]>
>["data"]["workflow_runs"][number];

type PullData = Awaited<
  ReturnType<Octokit["rest"]["pulls"]["list"]>
>["data"][number];

export const PAGE_SIZE = 10;

function mapRun(run: RunData, fullName: string): WorkflowRun {
  return {
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
  };
}

function mapPull(pr: PullData, fullName: string): PullRequest {
  return {
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
    mergeable: "UNKNOWN",
    state: pr.state === "closed" ? "closed" : "open",
    mergedAt: pr.merged_at ?? null,
  };
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
        per_page: PAGE_SIZE,
      });
      return data.workflow_runs.map((run) => mapRun(run, fullName));
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

export async function getPullRequests(
  token: string,
  repoFullNames: string[],
  state: PullRequestState = "open"
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
        state,
        per_page: PAGE_SIZE,
        sort: "updated",
        direction: "desc",
      });
      return data.map((pr) => mapPull(pr, fullName));
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
  // (Irrelevant for closed PRs.)
  if (state === "open" && pullRequests.length > 0) {
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

/** One page of older workflow runs for a single repo (page 1 = the dashboard's aggregated fetch) */
export async function getWorkflowRunsPage(
  token: string,
  repoFullName: string,
  page: number
): Promise<WorkflowRun[]> {
  const [owner, repo] = repoFullName.split("/");
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    per_page: PAGE_SIZE,
    page,
  });
  return data.workflow_runs.map((run) => mapRun(run, repoFullName));
}

/** One page of older pull requests for a single repo */
export async function getPullRequestsPage(
  token: string,
  repoFullName: string,
  state: PullRequestState,
  page: number
): Promise<PullRequest[]> {
  const [owner, repo] = repoFullName.split("/");
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.pulls.list({
    owner,
    repo,
    state,
    per_page: PAGE_SIZE,
    page,
    sort: "updated",
    direction: "desc",
  });
  const pullRequests = data.map((pr) => mapPull(pr, repoFullName));

  // Conflict status for this page's open PRs — one GraphQL query by number
  if (state === "open" && pullRequests.length > 0) {
    try {
      const fields = pullRequests
        .map((pr) => `p${pr.number}: pullRequest(number: ${pr.number}) { number mergeable }`)
        .join("\n");
      const result = await octokit.graphql<{
        repository: Record<string, { number: number; mergeable: string } | null>;
      }>(
        `query { repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) { ${fields} } }`
      );
      const byNumber = new Map(
        Object.values(result.repository)
          .filter((node): node is { number: number; mergeable: string } => !!node)
          .map((node) => [node.number, node.mergeable])
      );
      for (const pr of pullRequests) {
        const m = byNumber.get(pr.number);
        if (m === "MERGEABLE" || m === "CONFLICTING") pr.mergeable = m;
      }
    } catch {
      // Best-effort — page still renders without conflict info
    }
  }

  return pullRequests;
}

export type Commit = {
  sha: string;
  repo: string;
  /** First line of the commit message */
  message: string;
  author: { login: string; avatarUrl: string } | null;
  authorName: string;
  date: string;
  htmlUrl: string;
  /** Branch this commit was found on (a commit can exist on several) */
  branch: string;
};

export async function getBranches(
  token: string,
  repoFullName: string
): Promise<{ defaultBranch: string; branches: string[] }> {
  const [owner, repo] = repoFullName.split("/");
  const octokit = new Octokit({ auth: token });

  const [{ data: repoInfo }, branchPages] = await Promise.all([
    octokit.rest.repos.get({ owner, repo }),
    (async () => {
      const names: string[] = [];
      // Cap at 2 pages (200 branches) to keep the dropdown snappy
      for (let page = 1; page <= 2; page++) {
        const { data } = await octokit.rest.repos.listBranches({
          owner,
          repo,
          per_page: 100,
          page,
        });
        names.push(...data.map((b) => b.name));
        if (data.length < 100) break;
      }
      return names;
    })(),
  ]);

  const defaultBranch = repoInfo.default_branch;
  // Default branch first, the rest alphabetical
  const branches = [
    ...(branchPages.includes(defaultBranch) ? [defaultBranch] : []),
    ...branchPages.filter((b) => b !== defaultBranch).sort(),
  ];
  return { defaultBranch, branches };
}

export async function getCommits(
  token: string,
  repoFullName: string,
  branch: string,
  page: number
): Promise<Commit[]> {
  const [owner, repo] = repoFullName.split("/");
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha: branch,
    per_page: PAGE_SIZE,
    page,
  });
  return data.map((c) => ({
    sha: c.sha,
    repo: repoFullName,
    message: c.commit.message.split("\n")[0],
    author: c.author
      ? { login: c.author.login, avatarUrl: c.author.avatar_url }
      : null,
    authorName: c.commit.author?.name ?? c.author?.login ?? "unknown",
    date: c.commit.author?.date ?? c.commit.committer?.date ?? "",
    htmlUrl: c.html_url,
    branch,
  }));
}

type GqlCommitNode = {
  oid: string;
  messageHeadline: string;
  committedDate: string;
  url: string;
  author: {
    name: string | null;
    avatarUrl: string;
    user: { login: string } | null;
  } | null;
};

/**
 * Newest commits across ALL branches of a repo, merged & deduped.
 * One GraphQL query: 50 most recently active branches × 10 commits each.
 */
export async function getAllBranchCommits(
  token: string,
  repoFullName: string
): Promise<Commit[]> {
  const [owner, repo] = repoFullName.split("/");
  const octokit = new Octokit({ auth: token });

  const data = await octokit.graphql<{
    repository: {
      defaultBranchRef: { name: string } | null;
      refs: {
        nodes: {
          name: string;
          target: { history?: { nodes: GqlCommitNode[] } } | null;
        }[];
      };
    } | null;
  }>(
    `query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        defaultBranchRef { name }
        refs(
          refPrefix: "refs/heads/"
          first: 50
          orderBy: { field: TAG_COMMIT_DATE, direction: DESC }
        ) {
          nodes {
            name
            target {
              ... on Commit {
                history(first: 10) {
                  nodes {
                    oid
                    messageHeadline
                    committedDate
                    url
                    author { name avatarUrl user { login } }
                  }
                }
              }
            }
          }
        }
      }
    }`,
    { owner, repo }
  );

  const repository = data.repository;
  if (!repository) return [];
  const defaultBranch = repository.defaultBranchRef?.name;

  // Process the default branch first so commits already merged into it are
  // tagged with it (feature branches inherit shared history)
  const refs = [...repository.refs.nodes].sort(
    (a, b) =>
      Number(b.name === defaultBranch) - Number(a.name === defaultBranch)
  );

  const bySha = new Map<string, Commit>();
  for (const ref of refs) {
    for (const node of ref.target?.history?.nodes ?? []) {
      if (bySha.has(node.oid)) continue;
      bySha.set(node.oid, {
        sha: node.oid,
        repo: repoFullName,
        message: node.messageHeadline,
        author: node.author?.user
          ? { login: node.author.user.login, avatarUrl: node.author.avatarUrl }
          : null,
        authorName: node.author?.name ?? node.author?.user?.login ?? "unknown",
        date: node.committedDate,
        htmlUrl: node.url,
        branch: ref.name,
      });
    }
  }

  return [...bySha.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 100);
}

export type LatestRelease = {
  latestTag: string | null;
  /** Suggested next versions, preserving the latest tag's "v" prefix style */
  suggestions: { major: string; minor: string; patch: string };
};

/** Read latest release/tag and compute next-version suggestions */
export async function getLatestRelease(
  token: string,
  repoFullName: string
): Promise<LatestRelease> {
  const [owner, repo] = repoFullName.split("/");
  const octokit = new Octokit({ auth: token });

  let latestTag: string | null = null;
  try {
    const { data } = await octokit.rest.repos.getLatestRelease({ owner, repo });
    latestTag = data.tag_name;
  } catch {
    // No published release — fall back to the newest tag, if any
    try {
      const { data } = await octokit.rest.repos.listTags({
        owner,
        repo,
        per_page: 1,
      });
      latestTag = data[0]?.name ?? null;
    } catch {
      latestTag = null;
    }
  }

  return { latestTag, suggestions: bumpVersions(latestTag) };
}

/** Compute major/minor/patch bumps from a tag like "v1.4.9" → v2.0.0 / v1.5.0 / v1.4.10 */
function bumpVersions(tag: string | null): {
  major: string;
  minor: string;
  patch: string;
} {
  const prefix = tag?.startsWith("v") ? "v" : "";
  const match = tag?.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    const base = `${prefix || "v"}1.0.0`;
    return { major: base, minor: base, patch: base };
  }
  const [maj, min, pat] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  return {
    major: `${prefix}${maj + 1}.0.0`,
    minor: `${prefix}${maj}.${min + 1}.0`,
    patch: `${prefix}${maj}.${min}.${pat + 1}`,
  };
}

export async function createRelease(
  token: string,
  repoFullName: string,
  opts: {
    tag: string;
    target: string;
    name: string;
    body?: string;
    draft: boolean;
    prerelease: boolean;
    generateNotes: boolean;
  }
): Promise<{ tag: string; htmlUrl: string }> {
  const [owner, repo] = repoFullName.split("/");
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: opts.tag,
    target_commitish: opts.target,
    name: opts.name || opts.tag,
    body: opts.body || undefined,
    draft: opts.draft,
    prerelease: opts.prerelease,
    generate_release_notes: opts.generateNotes,
  });
  return { tag: data.tag_name, htmlUrl: data.html_url };
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
