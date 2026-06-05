"use client";

import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const ALL_BRANCHES = "__all__";

type Props = {
  branches: string[];
  defaultBranch?: string;
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
};

/** Branch picker with built-in search (Select can't filter) */
export function BranchCombobox({
  branches,
  defaultBranch,
  value,
  onChange,
  loading = false,
}: Props) {
  const [open, setOpen] = useState(false);

  function select(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-full items-center gap-1.5 rounded-lg border border-input bg-background py-2 pl-2.5 pr-2 text-sm transition-colors outline-none select-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5 shrink-0 text-muted-foreground"
          >
            <line x1="6" x2="6" y1="3" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
          <span className="min-w-0 flex-1 truncate text-left font-mono text-xs">
            {value === ALL_BRANCHES ? "All branches" : value}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5 shrink-0 text-muted-foreground"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        {/* defaultValue highlights the currently selected item on open */}
        <Command defaultValue={value}>
          <CommandInput placeholder="Search branch..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading branches..." : "No branch found."}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={ALL_BRANCHES}
                onSelect={() => select(ALL_BRANCHES)}
                data-checked={value === ALL_BRANCHES}
              >
                All branches
              </CommandItem>
              {branches.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => select(name)}
                  data-checked={value === name}
                  className="font-mono text-xs"
                >
                  <span className="truncate">{name}</span>
                  {name === defaultBranch && (
                    <span className="shrink-0 text-muted-foreground">
                      (default)
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
