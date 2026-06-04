import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listAccessibleRepos } from "@/lib/github";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const repos = await listAccessibleRepos(session.pat);
    return NextResponse.json(
      { repos },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to list repositories from GitHub" },
      { status: 502 }
    );
  }
}
