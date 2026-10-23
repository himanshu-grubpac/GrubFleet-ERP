import {
    getDashboardSemanticPillClass,
    type DashboardSemanticLevel,
} from "@/lib/format/dashboard-table-semantic-presentation";

const LEASE_STATUS_LEVEL: Record<string, DashboardSemanticLevel> = {
    Active: "success",
    Draft: "warning",
    "Pending Approval": "info",
    Approved: "info",
    "Awaiting Assets": "brand",
    Deactivated: "muted",
    "Billing Paused": "purple",
    "Pending Termination": "danger",
    Closed: "muted",
    Terminated: "danger",
};

/** List/detail status pill classes keyed by public status label from API. */
export function leaseStatusPillClass(publicStatusLabel: string): string {
    const level = LEASE_STATUS_LEVEL[publicStatusLabel];
    if (level) {
        return getDashboardSemanticPillClass(level);
    }
    return "bg-slate-100 text-slate-600";
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
