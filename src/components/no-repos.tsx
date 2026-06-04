import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NoRepos() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">
        No repositories selected yet. Choose which repositories to monitor in
        Settings.
      </p>
      <Button asChild size="sm">
        <Link href="/settings">Choose repositories</Link>
      </Button>
    </div>
  );
}
