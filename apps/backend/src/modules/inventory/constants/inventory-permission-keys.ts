export const InventoryPermissionKeys = {
  VIEW: 'inventory.view',
  CREATE: 'inventory.create',
  UPDATE: 'inventory.update',
  DELETE: 'inventory.delete',
  MANAGE: 'inventory.manage',
} as const;

export const InventoryWriteAny = {
  CREATE: [InventoryPermissionKeys.MANAGE, InventoryPermissionKeys.CREATE],
  UPDATE: [InventoryPermissionKeys.MANAGE, InventoryPermissionKeys.UPDATE],
  DELETE: [InventoryPermissionKeys.MANAGE, InventoryPermissionKeys.DELETE],
} as const;
