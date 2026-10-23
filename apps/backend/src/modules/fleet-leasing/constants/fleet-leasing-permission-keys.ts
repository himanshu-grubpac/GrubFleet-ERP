import { AssetRegisterPermissionKeys } from '../../asset-register/constants/asset-register-permission-keys';

export const FleetLeasingPermissionKeys = {
  VIEW: 'fleet_leasing.view',
  CREATE: 'fleet_leasing.create',
  UPDATE: 'fleet_leasing.update',
  DELETE: 'fleet_leasing.delete',
  MANAGE: 'fleet_leasing.manage',
} as const;

export const FleetLeasingWriteAny = {
  CREATE: [
    FleetLeasingPermissionKeys.MANAGE,
    FleetLeasingPermissionKeys.CREATE,
  ],
  UPDATE: [
    FleetLeasingPermissionKeys.MANAGE,
    FleetLeasingPermissionKeys.UPDATE,
  ],
  DELETE: [
    FleetLeasingPermissionKeys.MANAGE,
    FleetLeasingPermissionKeys.DELETE,
  ],
  APPROVE: [FleetLeasingPermissionKeys.MANAGE],
} as const;

/** Vehicle returns hub (Asset Management nav) — fleet or asset register read. */
export const FleetReturnsReadAny = [
  FleetLeasingPermissionKeys.VIEW,
  FleetLeasingPermissionKeys.MANAGE,
  AssetRegisterPermissionKeys.VIEW,
  AssetRegisterPermissionKeys.MANAGE,
] as const;
