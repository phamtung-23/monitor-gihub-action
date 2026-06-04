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

type Props = {
  repo: string;
  number: number;
  title: string;
};

export function ClosePrButton({ repo, number, title }: Props) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  async function closePr() {
    setClosing(true);
    setError(null);
    try {
      const res = await fetch("/api/close-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, number }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to close");
      setOpen(false);
      mutate("/api/pull-requests"); // PR leaves the open list right away
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClosing(false);
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
          variant="outline"
          size="sm"
          className="h-8 border-red-300 px-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
        >
          Close
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close PR #{number} without merging?</DialogTitle>
          <DialogDescription className="break-words">
            <span className="font-mono">{repo}</span> — {title}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={closing}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={closePr} disabled={closing}>
            {closing ? "Closing..." : "Close pull request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
