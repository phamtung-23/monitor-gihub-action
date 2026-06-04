"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadMoreButton({
  loading = false,
  onClick,
  className,
}: {
  loading?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "w-full text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {loading ? "Loading..." : "Load more"}
    </Button>
  );
}
