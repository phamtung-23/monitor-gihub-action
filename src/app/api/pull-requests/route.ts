import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getOpenPullRequests } from "@/lib/github";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings(session.userId);
  const data = await getOpenPullRequests(session.pat, settings.repos);
  // repos included so the client can tell "PR closed" apart from "repo unselected"
  return NextResponse.json(
    { ...data, repos: settings.repos },
    { headers: { "Cache-Control": "no-store" } }
  );
}
