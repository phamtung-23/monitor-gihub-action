import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { getSession } from "@/lib/session";

/** Check whether a PR that left the open list was merged or just closed */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo") ?? "";
  const number = Number(searchParams.get("number"));
  const [owner, name] = repo.split("/");
  if (!owner || !name || !Number.isInteger(number) || number <= 0) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  try {
    const octokit = new Octokit({ auth: session.pat });
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
