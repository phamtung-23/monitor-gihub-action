import { Badge } from "@/components/ui/badge";

const PALETTE = [
  "border-blue-300 text-blue-700 dark:text-blue-300",
  "border-purple-300 text-purple-700 dark:text-purple-300",
  "border-teal-300 text-teal-700 dark:text-teal-300",
  "border-orange-300 text-orange-700 dark:text-orange-300",
  "border-pink-300 text-pink-700 dark:text-pink-300",
  "border-cyan-300 text-cyan-700 dark:text-cyan-300",
];

const DOT_PALETTE = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
];

export function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Solid dot color matching the repo's badge color */
export function repoDotClass(repo: string): string {
  return DOT_PALETTE[hashCode(repo) % DOT_PALETTE.length];
}

/** Consistent per-repo color so repos are easy to tell apart at a glance */
export function RepoBadge({ repo }: { repo: string }) {
  const shortName = repo.split("/")[1] ?? repo;
  const color = PALETTE[hashCode(repo) % PALETTE.length];
  return (
    <Badge variant="outline" className={`shrink-0 font-mono ${color}`}>
      {shortName}
    </Badge>
  );
}
