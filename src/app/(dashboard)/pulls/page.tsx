import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { PullsView } from "@/components/pulls-view";
import { NoRepos } from "@/components/no-repos";

export default async function PullsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { repos } = await getSettings(session.userId);
  if (repos.length === 0) return <NoRepos />;
  return <PullsView repos={repos} />;
}
