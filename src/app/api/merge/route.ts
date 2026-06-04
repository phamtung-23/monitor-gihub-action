import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";

const MERGE_METHODS = new Set(["merge", "squash", "rebase"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repo?: string; number?: number; method?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { repo = "", number, method = "merge" } = body;
  const [owner, name] = repo.split("/");
  if (
    !owner ||
    !name ||
    !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
    !Number.isInteger(number) ||
    (number as number) <= 0 ||
    !MERGE_METHODS.has(method)
  ) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const settings = await getSettings(session.userId);
  const token = settings.pat || session.accessToken;

  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.pulls.merge({
      owner,
      repo: name,
      pull_number: number as number,
      merge_method: method as "merge" | "squash" | "rebase",
    });
    return NextResponse.json({ merged: data.merged, sha: data.sha });
  } catch (err) {
    // Surface GitHub's reason: not mergeable, method not allowed, no write access...
    const e = err as { status?: number; response?: { data?: { message?: string } } };
    const message = e.response?.data?.message ?? "Merge failed";
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
