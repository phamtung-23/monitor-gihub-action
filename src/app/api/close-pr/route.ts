import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repo?: string; number?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { repo = "", number } = body;
  const [owner, name] = repo.split("/");
  if (
    !owner ||
    !name ||
    !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
    !Number.isInteger(number) ||
    (number as number) <= 0
  ) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const settings = await getSettings(session.userId);
  const token = settings.pat || session.accessToken;

  try {
    const octokit = new Octokit({ auth: token });
    await octokit.rest.pulls.update({
      owner,
      repo: name,
      pull_number: number as number,
      state: "closed",
    });
    return NextResponse.json({ closed: true });
  } catch (err) {
    const e = err as { status?: number; response?: { data?: { message?: string } } };
    const message = e.response?.data?.message ?? "Failed to close pull request";
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
