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
