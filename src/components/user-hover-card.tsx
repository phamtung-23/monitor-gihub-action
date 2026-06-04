"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { GithubUser } from "@/lib/github";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

type Props = {
  login: string;
  avatarUrl: string;
  className?: string;
};

/** Avatar that shows the user's GitHub profile info on hover (lazy-loaded) */
export function UserHoverCard({ login, avatarUrl, className }: Props) {
  // Sticky: start fetching on first open and keep the data afterwards,
  // so re-hovering shows the card instantly instead of a skeleton flash
  const [opened, setOpened] = useState(false);
  const { data: user, isLoading } = useSWR<GithubUser>(
    opened ? `/api/users/${login}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return (
    <HoverCard
      openDelay={250}
      closeDelay={100}
      onOpenChange={(o) => o && setOpened(true)}
    >
      <HoverCardTrigger asChild>
        <Avatar className={cn("shrink-0", className)}>
          <AvatarImage src={avatarUrl} alt={login} />
          <AvatarFallback>{login[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </HoverCardTrigger>
      <HoverCardContent className="w-72" side="top" align="end">
        {isLoading || !user ? (
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={user.avatarUrl} alt={user.login} />
                <AvatarFallback>{user.login[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                {user.name && (
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                )}
                <a
                  href={user.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs text-muted-foreground hover:underline"
                >
                  @{user.login}
                </a>
              </div>
            </div>
            {user.bio && (
              <p className="line-clamp-3 text-xs text-muted-foreground">
                {user.bio}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {user.company && <span>🏢 {user.company}</span>}
              {user.location && <span>📍 {user.location}</span>}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">
                  {user.followers}
                </span>{" "}
                followers
              </span>
              <span>
                <span className="font-medium text-foreground">
                  {user.publicRepos}
                </span>{" "}
                repos
              </span>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
