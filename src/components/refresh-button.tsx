"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";

export function RefreshButton({
  keys = [],
  prefix,
}: {
  keys?: string[];
  /** Also revalidate every SWR key starting with this prefix */
  prefix?: string;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const { mutate } = useSWRConfig();

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        ...keys.map((key) => mutate(key)),
        prefix
          ? mutate((key) => typeof key === "string" && key.startsWith(prefix))
          : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`size-4 ${refreshing ? "animate-spin" : ""}`}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      Refresh
    </Button>
  );
}
