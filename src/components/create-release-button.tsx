"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { BranchCombobox } from "@/components/branch-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type BranchData = { defaultBranch: string; branches: string[] };
type LatestRelease = {
  latestTag: string | null;
  suggestions: { major: string; minor: string; patch: string };
};

type BumpKey = "patch" | "minor" | "major";

const BUMP_LABELS: Record<BumpKey, string> = {
  patch: "Patch",
  minor: "Minor",
  major: "Major",
};

export function CreateReleaseButton({ repo }: { repo: string }) {
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [tagEdited, setTagEdited] = useState(false);
  const [bump, setBump] = useState<BumpKey>("patch");
  const [target, setTarget] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [generateNotes, setGenerateNotes] = useState(true);
  const [draft, setDraft] = useState(false);
  const [prerelease, setPrerelease] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: release } = useSWR<LatestRelease>(
    open ? `/api/releases/latest?repo=${encodeURIComponent(repo)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (d) => {
        // Pre-fill the patch bump unless the user already typed a version
        if (!tagEdited) setTag(d.suggestions.patch);
      },
    }
  );

  const { data: branchData } = useSWR<BranchData>(
    open ? `/api/branches?repo=${encodeURIComponent(repo)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (d) => setTarget((t) => t || d.defaultBranch),
    }
  );

  function pickBump(key: BumpKey) {
    setBump(key);
    setTagEdited(false);
    if (release) setTag(release.suggestions[key]);
  }

  function reset() {
    setTag("");
    setTagEdited(false);
    setBump("patch");
    setTarget("");
    setName("");
    setBody("");
    setGenerateNotes(true);
    setDraft(false);
    setPrerelease(false);
    setError(null);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/create-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo,
          tag,
          target,
          name,
          body,
          draft,
          prerelease,
          generateNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create release");
      setOpen(false);
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = tag.trim() && target && !submitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          title="Create release"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
          Release
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Create release
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-sm font-medium text-muted-foreground">
              {repo}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Version tag</span>
              {release?.latestTag && (
                <span>
                  latest:{" "}
                  <span className="font-mono text-foreground">
                    {release.latestTag}
                  </span>
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <Input
                value={tag}
                onChange={(e) => {
                  setTag(e.target.value);
                  setTagEdited(true);
                }}
                placeholder="v1.0.0"
                className="flex-1 font-mono"
              />
              <div className="flex shrink-0 rounded-md border p-0.5">
                {(["patch", "minor", "major"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickBump(key)}
                    disabled={!release}
                    title={
                      release ? `→ ${release.suggestions[key]}` : undefined
                    }
                    className={cn(
                      "rounded-sm px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                      !tagEdited && bump === key
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {BUMP_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Target branch
            </label>
            <BranchCombobox
              branches={branchData?.branches ?? []}
              defaultBranch={branchData?.defaultBranch}
              value={target}
              onChange={setTarget}
              includeAll={false}
              loading={!branchData}
              placeholder="target branch"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Release title (optional)
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tag || "Defaults to the tag"}
            />
          </div>

          <label className="flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={generateNotes}
              onChange={(e) => setGenerateNotes(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Auto-generate release notes
          </label>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Description {generateNotes && "(appended above auto notes)"}
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe this release..."
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prerelease}
                onChange={(e) => setPrerelease(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Pre-release
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Draft
            </label>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting ? "Publishing..." : "Publish release"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
