"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSWRConfig } from "swr";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BranchData = { defaultBranch: string; branches: string[] };

export function CreatePrButton({
  repos,
  compact = false,
}: {
  repos: string[];
  /** Icon-only trigger for a per-repo column header */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [repo, setRepo] = useState(repos[0] ?? "");
  const [base, setBase] = useState("");
  const [head, setHead] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  // Branches for the chosen repo; base defaults to the repo's default branch
  const { data: branchData } = useSWR<BranchData>(
    open && repo ? `/api/branches?repo=${encodeURIComponent(repo)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (d) => setBase((b) => b || d.defaultBranch),
    }
  );
  const branches = branchData?.branches ?? [];

  function reset(nextRepo = repos[0] ?? "") {
    setRepo(nextRepo);
    setBase("");
    setHead("");
    setTitle("");
    setBody("");
    setDraft(false);
    setError(null);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, base, head, title, body, draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create PR");
      setOpen(false);
      reset();
      mutate("/api/pull-requests");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = repo && base && head && base !== head && title.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(repo);
      }}
    >
      <DialogTrigger asChild>
        {compact ? (
          <Button
            size="icon"
            variant="ghost"
            className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
            title="New pull request"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </Button>
        ) : (
          <Button size="sm" className="h-7 px-2.5 text-xs">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            New PR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Create pull request
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-sm font-medium text-muted-foreground">
              {repo}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {repos.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Repository
              </label>
              <Select
                value={repo}
                onValueChange={(v) => {
                  setRepo(v);
                  setBase("");
                  setHead("");
                }}
              >
                <SelectTrigger size="sm" className="w-full font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((r) => (
                    <SelectItem key={r} value={r} className="font-mono text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Base (merge into)
              </label>
              <BranchCombobox
                branches={branches}
                defaultBranch={branchData?.defaultBranch}
                value={base}
                onChange={setBase}
                includeAll={false}
                loading={!branchData}
                placeholder="base branch"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Compare (from)
              </label>
              <BranchCombobox
                branches={branches}
                defaultBranch={branchData?.defaultBranch}
                value={head}
                onChange={setHead}
                includeAll={false}
                loading={!branchData}
                placeholder="head branch"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pull request title"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your changes..."
              rows={4}
            />
          </div>

          <label className="flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Create as draft
          </label>

          {base && head && base === head && (
            <p className="text-xs text-amber-600">
              Base and compare branches must be different.
            </p>
          )}
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
          <Button onClick={submit} disabled={!canSubmit || submitting}>
            {submitting ? "Creating..." : "Create pull request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
