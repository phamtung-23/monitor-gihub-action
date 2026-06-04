import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  status: string | null;
  conclusion: string | null;
};

const ICONS = {
  check: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  spinner: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className="size-3 animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  alert: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  clock: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  x: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  skip: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
    >
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" x2="19" y1="5" y2="19" />
    </svg>
  ),
};

function resolve(status: string | null, conclusion: string | null) {
  if (status === "in_progress") {
    return {
      label: "Running",
      icon: ICONS.spinner,
      className: "bg-amber-500 text-white",
    };
  }
  if (
    status === "queued" ||
    status === "waiting" ||
    status === "pending" ||
    status === "requested"
  ) {
    return {
      label: "Queued",
      icon: ICONS.clock,
      className: "bg-zinc-400 text-white animate-pulse",
    };
  }
  switch (conclusion) {
    case "success":
      return {
        label: "Success",
        icon: ICONS.check,
        className: "bg-emerald-600 text-white",
      };
    case "failure":
      return {
        label: "Failed",
        icon: ICONS.alert,
        className: "bg-red-600 text-white",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        icon: ICONS.x,
        className: "bg-zinc-500 text-white",
      };
    case "timed_out":
      return {
        label: "Timed out",
        icon: ICONS.alert,
        className: "bg-red-600 text-white",
      };
    case "action_required":
      return {
        label: "Action required",
        icon: ICONS.alert,
        className: "bg-amber-600 text-white",
      };
    case "skipped":
      return {
        label: "Skipped",
        icon: ICONS.skip,
        className: "bg-zinc-400 text-white",
      };
    default:
      return {
        label: status ?? "Unknown",
        icon: null,
        className: "bg-zinc-400 text-white",
      };
  }
}

export function StatusBadge({ status, conclusion }: Props) {
  const { label, icon, className } = resolve(status, conclusion);
  return (
    <Badge className={cn("shrink-0 gap-1", className)}>
      {icon}
      {label}
    </Badge>
  );
}
