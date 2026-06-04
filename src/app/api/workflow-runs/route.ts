import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getWorkflowRuns } from "@/lib/github";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings(session.userId);
  const data = await getWorkflowRuns(session.pat, settings.repos);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
