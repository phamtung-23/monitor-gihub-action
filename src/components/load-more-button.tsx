"use client";

import { Button } from "@/components/ui/button";

export function LoadMoreButton({
  loading = false,
  onClick,
}: {
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={loading}
      className="w-full text-muted-foreground hover:text-foreground"
    >
      {loading ? "Loading..." : "Load more"}
    </Button>
  );
}
