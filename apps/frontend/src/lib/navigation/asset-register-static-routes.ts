/**
 * Static export (S3 + CloudFront): path-only shells; entity id in secure nav store.
 * @see lib/navigation/secure-entity-navigation.ts
 */

export type AssetRegisterEntityQueryKey = "assetClassId" | "vehicleId";

const MODULE_BASE = {
  assetClass: "/asset-register/assestclass",
  fleetRegister: "/asset-register/fleetregister",
  assetAssign: "/asset-register/asset-assign",
  complianceRenewals: "/asset-register/compliance-renewals",
} as const;

function detailHref(
  base: string,
  _queryKey: AssetRegisterEntityQueryKey,
  _id: string,
): string {
  return `${base}/detail/`;
}

function editHref(
  base: string,
  _queryKey: AssetRegisterEntityQueryKey,
  _id: string,
): string {
  return `${base}/edit/`;
}

export const assetRegisterAssetClassDetailHref = (assetClassId: string) =>
  detailHref(MODULE_BASE.assetClass, "assetClassId", assetClassId);

export const assetRegisterAssetClassEditHref = (assetClassId: string) =>
  editHref(MODULE_BASE.assetClass, "assetClassId", assetClassId);

export const assetRegisterFleetDetailHref = (vehicleId: string) =>
  detailHref(MODULE_BASE.fleetRegister, "vehicleId", vehicleId);

export const assetRegisterFleetEditHref = (vehicleId: string) =>
  editHref(MODULE_BASE.fleetRegister, "vehicleId", vehicleId);

export const assetRegisterFleetLeaseHistoryHref = (vehicleId: string) => {
  void vehicleId;
  return `${MODULE_BASE.fleetRegister}/detail/lease-history/`;
};

export const assetRegisterAssetAssignDetailHref = (vehicleId: string) =>
  detailHref(MODULE_BASE.assetAssign, "vehicleId", vehicleId);

export const assetRegisterBulkAssignHref = () =>
  `${MODULE_BASE.assetAssign}/bulk/`;

export const assetRegisterComplianceRenewalDetailHref = (vehicleId: string) =>
  detailHref(MODULE_BASE.complianceRenewals, "vehicleId", vehicleId);
