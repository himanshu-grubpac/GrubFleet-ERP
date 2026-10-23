/**
 * Static export (S3 + CloudFront): path-only shells; entity id in secure nav store.
 * @see lib/navigation/secure-entity-navigation.ts
 */

import { appendQueryToPath } from "./secure-entity-navigation";

export type FleetEntityQueryKey = "leaseId";

const LEASE_CONTRACTS_BASE = "/fleet-leasing/lease-contracts";
const RENEWALS_BASE = "/fleet-leasing/renewals-extensions";

function detailHref(base: string, detailSegment = "detail"): string {
  return `${base}/${detailSegment}/`;
}

function editHref(base: string): string {
  return `${base}/edit/`;
}

export const fleetLeaseContractDetailHref = (leaseId: string) => {
  void leaseId;
  return detailHref(LEASE_CONTRACTS_BASE);
};

export const fleetLeaseContractEditHref = (leaseId: string) => {
  void leaseId;
  return editHref(LEASE_CONTRACTS_BASE);
};

export const fleetLeaseContractChangeHistoryHref = (leaseId: string) => {
  void leaseId;
  return `${LEASE_CONTRACTS_BASE}/detail/change-history/`;
};

export const fleetLeaseContractEndLeaseHref = (leaseId: string) => {
  void leaseId;
  return `${LEASE_CONTRACTS_BASE}/end-lease/`;
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
