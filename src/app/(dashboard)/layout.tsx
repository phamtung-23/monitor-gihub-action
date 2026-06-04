import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { Sidebar } from "@/components/sidebar";
import { NavLinks } from "@/components/nav-links";
import { NotificationsWatcher } from "@/components/notifications-watcher";
import { RocketEarthIcon } from "@/components/rocket-earth-icon";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session) redirect("/login");

  const { repos } = await getSettings(session.userId);

  return (
    <div className="flex min-h-screen w-full">
      <NotificationsWatcher />
      <Sidebar
        repos={repos}
        user={{ name: session.user?.name, image: session.user?.image }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — sidebar is hidden below md */}
        <header className="flex flex-col gap-2 border-b p-3 md:hidden">
          <div className="flex items-center gap-2">
            <RocketEarthIcon className="size-8 shrink-0" />
            <span className="text-sm font-semibold">Deploy Monitor</span>
          </div>
          <NavLinks horizontal />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
