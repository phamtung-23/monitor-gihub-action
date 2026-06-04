import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRepos } from "@/lib/config";
import { Sidebar } from "@/components/sidebar";
import { NavLinks } from "@/components/nav-links";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session) redirect("/login");

  const repos = getRepos().map((r) => r.fullName);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        repos={repos}
        user={{ name: session.user?.name, image: session.user?.image }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — sidebar is hidden below md */}
        <header className="flex flex-col gap-2 border-b p-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <span className="text-sm font-semibold">Deploy Monitor</span>
          </div>
          <NavLinks horizontal />
        </header>
        <main className="flex-1 p-4 md:p-6">
          {repos.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No repositories configured. Set the{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                GITHUB_REPOS
              </code>{" "}
              environment variable, e.g.{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                myorg/fe,myorg/admin,myorg/be
              </code>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
