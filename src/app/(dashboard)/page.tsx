import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { DeploymentsView } from "@/components/deployments-view";
import { NoRepos } from "@/components/no-repos";

export default async function DeploymentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { repos } = await getSettings(session.userId);
  if (repos.length === 0) return <NoRepos />;
  return <DeploymentsView repos={repos} />;
}
