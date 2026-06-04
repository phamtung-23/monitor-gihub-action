import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getPullRequests } from "@/lib/github";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state") === "closed" ? "closed" : "open";

  const settings = await getSettings(session.userId);
  const data = await getPullRequests(session.pat, settings.repos, state);
  // repos included so the client can tell "PR closed" apart from "repo unselected"
  return NextResponse.json(
    { ...data, repos: settings.repos },
    { headers: { "Cache-Control": "no-store" } }
  );
}
