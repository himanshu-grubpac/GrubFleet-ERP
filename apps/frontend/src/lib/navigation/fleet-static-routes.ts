/**
 * Static export (S3 + CloudFront): fixed shells; runtime id in query string.
 * @see docs/deployment/s3-cloudfront-portal.md
 */

export type FleetEntityQueryKey = "leaseId";

const LEASE_CONTRACTS_BASE = "/fleet-leasing/lease-contracts";
const RENEWALS_BASE = "/fleet-leasing/renewals-extensions";

function detailHref(
  base: string,
  queryKey: FleetEntityQueryKey,
  id: string,
  detailSegment = "detail",
): string {
  const trimmed = id.trim();
  const path = `${base}/${detailSegment}/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?${queryKey}=${encodeURIComponent(trimmed)}`;
}

function editHref(
  base: string,
  queryKey: FleetEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  const path = `${base}/edit/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?${queryKey}=${encodeURIComponent(trimmed)}`;
}

export const fleetLeaseContractDetailHref = (leaseId: string) =>
  detailHref(LEASE_CONTRACTS_BASE, "leaseId", leaseId);

export const fleetLeaseContractEditHref = (leaseId: string) =>
  editHref(LEASE_CONTRACTS_BASE, "leaseId", leaseId);

export const fleetLeaseContractChangeHistoryHref = (leaseId: string) => {
  const trimmed = leaseId.trim();
  const path = `${LEASE_CONTRACTS_BASE}/detail/change-history/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?leaseId=${encodeURIComponent(trimmed)}`;
};

export const fleetRenewLeaseContractHref = (leaseId: string) => {
  const trimmed = leaseId.trim();
  const path = `${RENEWALS_BASE}/renew/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?leaseId=${encodeURIComponent(trimmed)}`;
};

/** Detail URL after wizard confirm (optional query flag). */
export const fleetLeaseContractDetailConfirmedHref = (leaseId: string) =>
  `${fleetLeaseContractDetailHref(leaseId)}&confirmed=1`;
