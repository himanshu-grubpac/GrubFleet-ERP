/**
 * Static export (S3 + CloudFront): fixed shells; runtime id in query string.
 * @see docs/deployment/s3-cloudfront-portal.md
 */

export type AssetRegisterEntityQueryKey =
  | "assetClassId"
  | "assetMasterId"
  | "vehicleId";

const MODULE_BASE = {
  assetClass: "/asset-register/assestclass",
  assetMaster: "/asset-register/asset-master",
  fleetRegister: "/asset-register/fleetregister",
  assetAssign: "/asset-register/asset-assign",
  complianceRenewals: "/asset-register/compliance-renewals",
} as const;

function detailHref(
  base: string,
  queryKey: AssetRegisterEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  const path = `${base}/detail/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?${queryKey}=${encodeURIComponent(trimmed)}`;
}

function editHref(
  base: string,
  queryKey: AssetRegisterEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  const path = `${base}/edit/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?${queryKey}=${encodeURIComponent(trimmed)}`;
}

export const assetRegisterAssetClassDetailHref = (assetClassId: string) =>
  detailHref(MODULE_BASE.assetClass, "assetClassId", assetClassId);

export const assetRegisterAssetClassEditHref = (assetClassId: string) =>
  editHref(MODULE_BASE.assetClass, "assetClassId", assetClassId);

export const assetRegisterAssetMasterDetailHref = (assetMasterId: string) =>
  detailHref(MODULE_BASE.assetMaster, "assetMasterId", assetMasterId);

export const assetRegisterAssetMasterEditHref = (assetMasterId: string) =>
  editHref(MODULE_BASE.assetMaster, "assetMasterId", assetMasterId);

export const assetRegisterFleetDetailHref = (vehicleId: string) =>
  detailHref(MODULE_BASE.fleetRegister, "vehicleId", vehicleId);

export const assetRegisterFleetEditHref = (vehicleId: string) =>
  editHref(MODULE_BASE.fleetRegister, "vehicleId", vehicleId);

export const assetRegisterFleetLeaseHistoryHref = (vehicleId: string) => {
  const trimmed = vehicleId.trim();
  const path = `${MODULE_BASE.fleetRegister}/detail/lease-history/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?vehicleId=${encodeURIComponent(trimmed)}`;
};

export const assetRegisterAssetAssignDetailHref = (vehicleId: string) =>
  detailHref(MODULE_BASE.assetAssign, "vehicleId", vehicleId);

export const assetRegisterComplianceRenewalDetailHref = (vehicleId: string) =>
  detailHref(MODULE_BASE.complianceRenewals, "vehicleId", vehicleId);
