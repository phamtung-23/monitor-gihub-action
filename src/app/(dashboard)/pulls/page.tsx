import { getRepos } from "@/lib/config";
import { PullsView } from "@/components/pulls-view";

export default function PullsPage() {
  const repos = getRepos().map((r) => r.fullName);
  return <PullsView repos={repos} />;
}
