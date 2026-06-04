import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { sealSession } from "@/lib/session";

export async function POST(request: Request) {
  let body: { pat?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pat = (body.pat ?? "").trim();
  if (!pat) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Validate the token and resolve the user's identity from it
  let user;
  try {
    const octokit = new Octokit({ auth: pat });
    ({ data: user } = await octokit.rest.users.getAuthenticated());
  } catch {
    return NextResponse.json(
      { error: "Token is invalid or expired — GitHub rejected it" },
      { status: 422 }
    );
  }

  const cookie = await sealSession({
    userId: String(user.id),
    login: user.login,
    name: user.name,
    image: user.avatar_url,
    pat,
  });

  const response = NextResponse.json({ ok: true, login: user.login });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
