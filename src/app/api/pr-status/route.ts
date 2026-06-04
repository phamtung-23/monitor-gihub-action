import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";

/** Check whether a PR that left the open list was merged or just closed */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo") ?? "";
  const number = Number(searchParams.get("number"));
  const [owner, name] = repo.split("/");
  if (!owner || !name || !Number.isInteger(number) || number <= 0) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const settings = await getSettings(session.userId);
  const token = settings.pat || session.accessToken;

  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.pulls.get({
      owner,
      repo: name,
      pull_number: number,
    });
    return NextResponse.json(
      { merged: data.merged, state: data.state },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
