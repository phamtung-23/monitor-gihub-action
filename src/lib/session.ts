import "server-only";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";

export type Session = {
  /** GitHub numeric user id (stable across renames) */
  userId: string;
  login: string;
  name: string | null;
  image: string;
  /** Classic PAT used for all GitHub API calls */
  pat: string;
};

const COOKIE_NAME = "monitor.session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function getKey(): Promise<Uint8Array> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`monitor.session:${secret}`)
  );
  return new Uint8Array(hash);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtDecrypt(raw, await getKey());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.login !== "string" ||
      typeof payload.pat !== "string" ||
      !payload.pat
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      login: payload.login,
      name: typeof payload.name === "string" ? payload.name : null,
      image: typeof payload.image === "string" ? payload.image : "",
      pat: payload.pat,
    };
  } catch {
    return null;
  }
}

/** Serialize a session into an encrypted cookie (set it on a response). */
export async function sealSession(
  session: Session
): Promise<{ name: string; value: string; options: Record<string, unknown> }> {
  const value = await new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
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

export const SESSION_COOKIE_NAME = COOKIE_NAME;
