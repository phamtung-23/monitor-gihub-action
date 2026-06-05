import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAllBranchCommits, getCommits } from "@/lib/github";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo") ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
  }

  // All-branches mode: newest commits across every branch, merged & deduped
  if (searchParams.get("all") === "1") {
    try {
      const commits = await getAllBranchCommits(session.pat, repo);
      return NextResponse.json(
        { commits },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch {
      return NextResponse.json(
        { error: "Failed to load commits" },
        { status: 502 }
      );
    }
  }

  const branch = searchParams.get("branch") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  if (
    !branch ||
    branch.length > 250 ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100
  ) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  try {
    const commits = await getCommits(session.pat, repo, branch, page);
    return NextResponse.json(
      { commits },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load commits" },
      { status: 502 }
    );
  }
}
