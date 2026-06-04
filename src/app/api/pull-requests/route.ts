import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOpenPullRequests } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional server-side PAT — bypasses org OAuth App access restrictions.
  // Login (above) still controls who can reach this endpoint.
  const token = process.env.GITHUB_TOKEN || session.accessToken;
  const data = await getOpenPullRequests(token);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
