export type RepoRef = {
  owner: string;
  repo: string;
  /** "owner/repo" */
  fullName: string;
};

/**
 * Parse GITHUB_REPOS env var, e.g. "myorg/fe,myorg/admin,myorg/be"
 */
export function getRepos(): RepoRef[] {
  const raw = process.env.GITHUB_REPOS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((fullName) => {
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo) {
        throw new Error(
          `Invalid entry "${fullName}" in GITHUB_REPOS — expected "owner/repo"`
        );
      }
      return { owner, repo, fullName };
    });
}

export function getOrg(): string | undefined {
  return process.env.GITHUB_ORG || undefined;
}

/**
 * Extra GitHub usernames allowed to sign in even if not org members
 * (e.g. outside collaborators). Comma-separated, case-insensitive.
 */
export function getAllowedUsers(): string[] {
  return (process.env.GITHUB_ALLOWED_USERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
