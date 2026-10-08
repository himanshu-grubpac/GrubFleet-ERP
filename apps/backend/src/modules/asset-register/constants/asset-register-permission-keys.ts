export const AssetRegisterPermissionKeys = {
  VIEW: 'asset_register.view',
  CREATE: 'asset_register.create',
  UPDATE: 'asset_register.update',
  DELETE: 'asset_register.delete',
  MANAGE: 'asset_register.manage',
} as const;

export const AssetRegisterWriteAny = {
  CREATE: [
    AssetRegisterPermissionKeys.MANAGE,
    AssetRegisterPermissionKeys.CREATE,
  ],
  UPDATE: [
    AssetRegisterPermissionKeys.MANAGE,
    AssetRegisterPermissionKeys.UPDATE,
  ],
} as const;
