export const WorkshopPermissionKeys = {
  VIEW: 'workshop.view',
  CREATE: 'workshop.create',
  UPDATE: 'workshop.update',
  DELETE: 'workshop.delete',
  MANAGE: 'workshop.manage',
} as const;

export const WorkshopWriteAny = {
  CREATE: [WorkshopPermissionKeys.MANAGE, WorkshopPermissionKeys.CREATE],
  UPDATE: [WorkshopPermissionKeys.MANAGE, WorkshopPermissionKeys.UPDATE],
  DELETE: [WorkshopPermissionKeys.MANAGE, WorkshopPermissionKeys.DELETE],
} as const;
