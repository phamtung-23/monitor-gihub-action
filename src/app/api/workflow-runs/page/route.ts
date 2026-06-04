import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getWorkflowRunsPage } from "@/lib/github";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo") ?? "";
  const page = Number(searchParams.get("page"));
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
    !Number.isInteger(page) ||
    page < 2 ||
    page > 100
  ) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  try {
    const runs = await getWorkflowRunsPage(session.pat, repo, page);
    return NextResponse.json(
      { runs },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load more runs" },
      { status: 502 }
    );
  }
}
