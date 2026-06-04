import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { getOpenPullRequests } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // User's PAT (if configured) bypasses org OAuth App access restrictions
  const settings = await getSettings(session.userId);
  const token = settings.pat || session.accessToken;
  const data = await getOpenPullRequests(token, settings.repos);
  // repos included so the client can tell "PR closed" apart from "repo unselected"
  return NextResponse.json(
    { ...data, repos: settings.repos },
    { headers: { "Cache-Control": "no-store" } }
  );
}
