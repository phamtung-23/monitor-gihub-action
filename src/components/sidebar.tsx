import { signOut } from "@/auth";
import { NavLinks } from "@/components/nav-links";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { repoDotClass } from "@/components/repo-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  repos: string[];
  user: { name?: string | null; image?: string | null };
};

export function Sidebar({ repos, user }: Props) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="text-lg">🚀</span>
        <span className="text-sm font-semibold">Deploy Monitor</span>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
        <NavLinks />

        <div>
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Repositories
          </p>
          <ul className="flex flex-col gap-0.5">
            {repos.map((repo) => (
              <li key={repo}>
                <a
                  href={`https://github.com/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${repoDotClass(repo)}`}
                  />
                  <span className="truncate font-mono text-xs">
                    {repo.split("/")[1] ?? repo}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t p-3">
        <NotificationsToggle />
        <div className="flex items-center gap-2.5 px-1">
          <Avatar className="size-7">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-sm">{user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              title="Sign out"
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
