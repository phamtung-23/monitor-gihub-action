import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { auth } from "@/auth";
import { getSettings, sealSettings, type UserSettings } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings(session.userId);
  // Never send the PAT back to the client — only whether one is set
  return NextResponse.json(
    { hasPat: Boolean(settings.pat), repos: settings.repos },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type PutBody = {
  /** undefined = keep current, "" = clear, non-empty = set new */
  pat?: string;
  repos?: string[];
};

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await getSettings(session.userId);
  const next: UserSettings = { ...current };

  if (body.repos !== undefined) {
    if (
      !Array.isArray(body.repos) ||
      body.repos.some((r) => typeof r !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(r))
    ) {
      return NextResponse.json(
        { error: "repos must be an array of \"owner/repo\" strings" },
        { status: 400 }
      );
    }
    next.repos = [...new Set(body.repos)];
  }

  if (body.pat !== undefined) {
    const pat = body.pat.trim();
    if (pat === "") {
      next.pat = undefined;
    } else {
      // Validate the token before saving
      try {
        const octokit = new Octokit({ auth: pat });
        await octokit.rest.users.getAuthenticated();
      } catch {
        return NextResponse.json(
          { error: "Token is invalid or expired — GitHub rejected it" },
          { status: 422 }
        );
      }
      next.pat = pat;
    }
  }

  const cookie = await sealSettings(session.userId, next);
  const response = NextResponse.json({
    hasPat: Boolean(next.pat),
    repos: next.repos,
  });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
