import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBranches } from "@/lib/github";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo") ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
  }

  try {
    const data = await getBranches(session.pat, repo);
    // Branch lists change rarely — cache briefly in the browser
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to list branches" },
      { status: 502 }
    );
  }
}
