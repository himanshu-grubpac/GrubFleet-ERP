import type { LeaseContractListItem } from "@/lib/api/lease-contracts";

/** Mirrors backend EDITABLE_CONTRACT_STATUSES for list-row edit affordance. */
const EDITABLE_RAW_STATUSES = new Set([
  "draft",
  "pending_approval",
  "approved",
  "active",
  "awaiting_assets",
  "deactivated",
  "billing_paused",
]);

export function canEditLeaseContractListRow(
  row: LeaseContractListItem,
): boolean {
  return EDITABLE_RAW_STATUSES.has(row.rawStatus);
}

export function canDeactivateLeaseContractListRow(
  row: LeaseContractListItem,
): boolean {
  return row.rawStatus === "active";
}

export function canReactivateLeaseContractListRow(
  row: LeaseContractListItem,
): boolean {
  return (
    row.rawStatus === "deactivated" || row.rawStatus === "billing_paused"
  );
}

export function canActivateDraftLeaseContractListRow(
  row: LeaseContractListItem,
): boolean {
  return row.rawStatus === "draft";
}
