import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { PullsView } from "@/components/pulls-view";
import { NoRepos } from "@/components/no-repos";

export default async function PullsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { repos } = await getSettings(session.userId);
  if (repos.length === 0) return <NoRepos />;
  return <PullsView repos={repos} />;
}
