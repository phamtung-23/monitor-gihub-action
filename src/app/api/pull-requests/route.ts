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
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
