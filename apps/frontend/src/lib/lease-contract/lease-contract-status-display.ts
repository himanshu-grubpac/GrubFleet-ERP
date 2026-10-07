/** List/detail status pill classes keyed by public status label from API. */
const LEASE_STATUS_PILL_CLASS: Record<string, string> = {
  Active: "bg-green-50 text-green-700",
  Draft: "bg-amber-50 text-amber-800",
  "Pending Approval": "bg-blue-50 text-blue-800",
  Approved: "bg-blue-50 text-blue-700",
  "Awaiting Assets": "bg-orange-50 text-orange-800",
  Deactivated: "bg-gray-100 text-gray-600",
  "Billing Paused": "bg-purple-50 text-purple-800",
  "Pending Termination": "bg-red-50 text-red-700",
  Closed: "bg-gray-100 text-gray-500",
  Terminated: "bg-red-50 text-red-700",
};

export function leaseStatusPillClass(publicStatusLabel: string): string {
  return (
    LEASE_STATUS_PILL_CLASS[publicStatusLabel] ??
    "bg-slate-100 text-slate-600"
  );
}

/** Detail header label — prefer API `status`; never collapse unknown to Draft. */
export function leaseContractHeaderStatusLabel(
  publicStatus: string,
  rawStatus?: string,
): string {
  const trimmed = publicStatus?.trim();
  if (trimmed) return trimmed;
  if (rawStatus === "closed" || rawStatus === "concluded") return "Closed";
  return rawStatus ? rawStatus.replace(/_/g, " ") : "—";
}
