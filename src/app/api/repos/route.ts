import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { listAccessibleRepos } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings(session.userId);
  const token = settings.pat || session.accessToken;

  try {
    const repos = await listAccessibleRepos(token);
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
