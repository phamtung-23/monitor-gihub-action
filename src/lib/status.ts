/** Workflow run statuses that mean "still running" (not completed yet) */
export const RUNNING_STATUSES = new Set([
  "queued",
  "in_progress",
  "waiting",
  "pending",
  "requested",
]);

export function isRunning(status: string | null): boolean {
  return status !== null && RUNNING_STATUSES.has(status);
}
