import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { NotificationsWatcher } from "@/components/notifications-watcher";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { repos } = await getSettings(session.userId);

  return (
    <div className="flex min-h-screen w-full">
      <NotificationsWatcher />
      <Sidebar
        repos={repos}
        user={{ name: session.name ?? session.login, image: session.image }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          user={{ name: session.name ?? session.login, image: session.image }}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
