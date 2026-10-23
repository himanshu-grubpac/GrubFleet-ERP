/**
 * Static export (S3 + CloudFront): path-only shells; entity id in secure nav store.
 * @see lib/navigation/secure-entity-navigation.ts
 */

import { appendQueryToPath } from "./secure-entity-navigation";

export type FleetEntityQueryKey = "leaseId";

const LEASE_CONTRACTS_BASE = "/fleet-leasing/lease-contracts";
const RENEWALS_BASE = "/fleet-leasing/renewals-extensions";

function detailHref(
  base: string,
  _queryKey: FleetEntityQueryKey,
  _id: string,
  detailSegment = "detail",
): string {
  return `${base}/${detailSegment}/`;
}

function editHref(
  base: string,
  _queryKey: FleetEntityQueryKey,
  _id: string,
): string {
  return `${base}/edit/`;
}

export const fleetLeaseContractDetailHref = (leaseId: string) =>
  detailHref(LEASE_CONTRACTS_BASE, "leaseId", leaseId);

export const fleetLeaseContractEditHref = (leaseId: string) =>
  editHref(LEASE_CONTRACTS_BASE, "leaseId", leaseId);

export const fleetLeaseContractChangeHistoryHref = (leaseId: string) => {
  void leaseId;
  return `${LEASE_CONTRACTS_BASE}/detail/change-history/`;
};

export const fleetRenewLeaseContractHref = (leaseId: string) => {
  void leaseId;
  return `${RENEWALS_BASE}/renew/`;
};

/** Detail URL after wizard confirm (non-id query flag only). */
export const fleetLeaseContractDetailConfirmedHref = (leaseId: string) =>
  appendQueryToPath(fleetLeaseContractDetailHref(leaseId), {
    confirmed: "1",
  });
