"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type Props = {
  repo: string;
  number: number;
  title: string;
  hasConflicts?: boolean;
};

const METHOD_LABELS: Record<string, string> = {
  merge: "Create a merge commit",
  squash: "Squash and merge",
  rebase: "Rebase and merge",
};

export function MergeButton({ repo, number, title, hasConflicts = false }: Props) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("merge");
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  async function merge() {
    setMerging(true);
    setError(null);
    try {
      const res = await fetch("/api/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, number, method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Merge failed");
      setOpen(false);
      mutate("/api/pull-requests"); // PR leaves the open list right away
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMerging(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={hasConflicts}
          title={hasConflicts ? "Resolve conflicts before merging" : undefined}
          className="h-8 bg-emerald-600 px-3 text-sm text-white hover:bg-emerald-700"
        >
          Merge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Merge PR #{number}?
          </DialogTitle>
          <DialogDescription className="break-words">
            <span className="font-mono">{repo}</span> — {title}
          </DialogDescription>
        </DialogHeader>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(METHOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={merging}
          >
            Cancel
          </Button>
          <Button
            onClick={merge}
            disabled={merging}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {merging ? "Merging..." : "Confirm merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
