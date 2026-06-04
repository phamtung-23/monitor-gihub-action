import "server-only";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";

export type UserSettings = {
  /** Optional classic PAT — overrides the OAuth token for GitHub data fetching */
  pat?: string;
  /** Repos to monitor, as "owner/repo" */
  repos: string[];
};

const COOKIE_NAME = "monitor.settings";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const EMPTY: UserSettings = { repos: [] };

async function getKey(): Promise<Uint8Array> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`monitor.settings:${secret}`)
  );
  return new Uint8Array(hash);
}

/**
 * Read the current user's settings from the encrypted cookie.
 * `userId` binds the cookie to the signed-in account — settings saved by a
 * different account in the same browser are ignored.
 */
export async function getSettings(userId: string): Promise<UserSettings> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return EMPTY;
  try {
    const { payload } = await jwtDecrypt(raw, await getKey());
    if (payload.uid !== userId) return EMPTY;
    return {
      pat: typeof payload.pat === "string" && payload.pat ? payload.pat : undefined,
      repos: Array.isArray(payload.repos) ? (payload.repos as string[]) : [],
    };
  } catch {
    return EMPTY;
  }
}

/** Serialize settings into an encrypted cookie value (set it on a response). */
export async function sealSettings(
  userId: string,
  settings: UserSettings
): Promise<{ name: string; value: string; options: Record<string, unknown> }> {
  const value = await new EncryptJWT({
    uid: userId,
    pat: settings.pat ?? "",
    repos: settings.repos,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .encrypt(await getKey());

  return {
    name: COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    },
  };
}
