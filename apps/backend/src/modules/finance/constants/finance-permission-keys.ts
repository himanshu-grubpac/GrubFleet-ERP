export const FinancePermissionKeys = {
  VIEW: 'finance.view',
  CREATE: 'finance.create',
  UPDATE: 'finance.update',
  DELETE: 'finance.delete',
  MANAGE: 'finance.manage',
} as const;

export const FinanceWriteAny = {
  CREATE: [FinancePermissionKeys.MANAGE, FinancePermissionKeys.CREATE],
  UPDATE: [FinancePermissionKeys.MANAGE, FinancePermissionKeys.UPDATE],
  DELETE: [FinancePermissionKeys.MANAGE, FinancePermissionKeys.DELETE],
} as const;
