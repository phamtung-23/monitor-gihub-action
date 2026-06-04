import { getRepos } from "@/lib/config";
import { DeploymentsView } from "@/components/deployments-view";

export default function DeploymentsPage() {
  const repos = getRepos().map((r) => r.fullName);
  return <DeploymentsView repos={repos} />;
}
