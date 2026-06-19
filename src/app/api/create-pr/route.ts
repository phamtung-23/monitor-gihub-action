import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    repo?: string;
    base?: string;
    head?: string;
    title?: string;
    body?: string;
    draft?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { repo = "", base = "", head = "", title = "", draft = false } = body;
  const [owner, name] = repo.split("/");
  if (
    !owner ||
    !name ||
    !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
    !base ||
    !head ||
    base === head ||
    !title.trim()
  ) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  try {
    const octokit = new Octokit({ auth: session.pat });
    const { data } = await octokit.rest.pulls.create({
      owner,
      repo: name,
      base,
      head,
      title: title.trim(),
      body: body.body?.trim() || undefined,
      draft,
    });
    return NextResponse.json({ number: data.number, htmlUrl: data.html_url });
  } catch (err) {
    // Surface GitHub's reason: no commits between branches, PR already exists...
    const e = err as {
      status?: number;
      response?: { data?: { message?: string; errors?: { message?: string }[] } };
    };
    const message =
      e.response?.data?.errors?.[0]?.message ??
      e.response?.data?.message ??
      "Failed to create pull request";
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
