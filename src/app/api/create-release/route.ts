import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createRelease } from "@/lib/github";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    repo?: string;
    tag?: string;
    target?: string;
    name?: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
    generateNotes?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { repo = "", tag = "", target = "" } = body;
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
    !tag.trim() ||
    tag.length > 250 ||
    !target.trim()
  ) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  try {
    const result = await createRelease(session.pat, repo, {
      tag: tag.trim(),
      target: target.trim(),
      name: body.name?.trim() ?? tag.trim(),
      body: body.body?.trim(),
      draft: !!body.draft,
      prerelease: !!body.prerelease,
      generateNotes: !!body.generateNotes,
    });
    return NextResponse.json(result);
  } catch (err) {
    // Surface GitHub's reason: tag already exists, no write access...
    const e = err as {
      status?: number;
      response?: { data?: { message?: string; errors?: { code?: string }[] } };
    };
    let message = e.response?.data?.message ?? "Failed to create release";
    if (e.response?.data?.errors?.some((x) => x.code === "already_exists")) {
      message = "A release with this tag already exists";
    }
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
