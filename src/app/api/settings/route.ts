import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSettings, sealSettings } from "@/lib/settings";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings(session.userId);
  return NextResponse.json(
    { repos: settings.repos },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repos?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !Array.isArray(body.repos) ||
    body.repos.some((r) => typeof r !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(r))
  ) {
    return NextResponse.json(
      { error: 'repos must be an array of "owner/repo" strings' },
      { status: 400 }
    );
  }

  const repos = [...new Set(body.repos)];
  const cookie = await sealSettings(session.userId, { repos });
  const response = NextResponse.json({ repos });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
