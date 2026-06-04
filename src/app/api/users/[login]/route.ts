import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/github";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ login: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { login } = await params;
  if (!/^[\w-]+$/.test(login)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    const user = await getUser(session.pat, login);
    // Profile data rarely changes — let the browser cache it for 10 minutes
    return NextResponse.json(user, {
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
