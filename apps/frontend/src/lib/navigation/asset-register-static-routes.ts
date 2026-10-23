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
  vehicleReturns: "/asset-register/vehicle-returns",
} as const;

function detailHref(base: string): string {
  return `${base}/detail/`;
}

function editHref(base: string): string {
  return `${base}/edit/`;
}

export const assetRegisterAssetClassDetailHref = (assetClassId: string) => {
  void assetClassId;
  return detailHref(MODULE_BASE.assetClass);
};

export const assetRegisterAssetClassEditHref = (assetClassId: string) => {
  void assetClassId;
  return editHref(MODULE_BASE.assetClass);
};

export const assetRegisterFleetDetailHref = (vehicleId: string) => {
  void vehicleId;
  return detailHref(MODULE_BASE.fleetRegister);
};

export const assetRegisterFleetEditHref = (vehicleId: string) => {
  void vehicleId;
  return editHref(MODULE_BASE.fleetRegister);
};

export const assetRegisterFleetLeaseHistoryHref = (vehicleId: string) => {
  void vehicleId;
  return `${MODULE_BASE.fleetRegister}/detail/lease-history/`;
};

export const assetRegisterAssetAssignDetailHref = (vehicleId: string) => {
  void vehicleId;
  return detailHref(MODULE_BASE.assetAssign);
};

export const assetRegisterBulkAssignHref = () =>
  `${MODULE_BASE.assetAssign}/bulk/`;

export const assetRegisterComplianceRenewalDetailHref = (vehicleId: string) => {
  void vehicleId;
  return detailHref(MODULE_BASE.complianceRenewals);
};

export const assetRegisterVehicleReturnReceiveHref = (
  _returnInspectionId: string,
) => {
  void _returnInspectionId;
  return `${MODULE_BASE.vehicleReturns}/receive/`;
};

export const assetRegisterVehicleReturnInspectHref = (
  _returnInspectionId: string,
) => {
  void _returnInspectionId;
  return `${MODULE_BASE.vehicleReturns}/inspect/`;
};

export const assetRegisterVehicleReturnInspectFinalizeHref = (
  _returnInspectionId: string,
) => {
  void _returnInspectionId;
  return `${MODULE_BASE.vehicleReturns}/inspect-finalize/`;
};

export const assetRegisterVehicleReturnInspectResultHref = (
  _returnInspectionId: string,
) => {
  void _returnInspectionId;
  return `${MODULE_BASE.vehicleReturns}/inspect-result/`;
};

export const assetRegisterVehicleReturnReInspectHref = (
  _returnInspectionId: string,
) => {
  void _returnInspectionId;
  return `${MODULE_BASE.vehicleReturns}/re-inspect/`;
};
