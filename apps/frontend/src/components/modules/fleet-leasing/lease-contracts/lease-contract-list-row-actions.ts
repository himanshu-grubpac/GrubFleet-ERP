import type { LeaseContractListItem } from "@/lib/api/lease-contracts";

/** Mirrors backend `EDITABLE_CONTRACT_STATUSES` (list has no availableActions). */
/** Non-deactivated editable statuses (rule 31 — list has no availableActions). */
const EDITABLE_RAW_STATUSES = new Set([
  "draft",
  "pending_approval",
  "approved",
  "active",
  "awaiting_assets",
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

/** Backend POST /activate — approved or awaiting_assets only (not draft). */
const ACTIVATABLE_RAW_STATUSES = new Set(["approved", "awaiting_assets"]);

export function canActivateLeaseContractListRow(
  row: LeaseContractListItem,
): boolean {
  return ACTIVATABLE_RAW_STATUSES.has(row.rawStatus);
}

export function canActivateLeaseContractByRawStatus(
  rawStatus: string,
): boolean {
  return ACTIVATABLE_RAW_STATUSES.has(rawStatus);
}
