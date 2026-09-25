/** Permission keys enforced on administration HTTP routes. */
export const PermissionKeys = {
  ADMINISTRATION_VIEW: 'administration.view',
  ADMINISTRATION_CREATE: 'administration.create',
  ADMINISTRATION_UPDATE: 'administration.update',
  ADMINISTRATION_DELETE: 'administration.delete',
  ADMINISTRATION_MANAGE: 'administration.manage',
} as const;

export type PermissionKey =
  (typeof PermissionKeys)[keyof typeof PermissionKeys];

/** FULL (.manage) or MANAGE-tier CRUD keys for administration mutations. */
export const AdministrationWriteAny = {
  CREATE: [
    PermissionKeys.ADMINISTRATION_MANAGE,
    PermissionKeys.ADMINISTRATION_CREATE,
  ],
  UPDATE: [
    PermissionKeys.ADMINISTRATION_MANAGE,
    PermissionKeys.ADMINISTRATION_UPDATE,
  ],
  DELETE: [
    PermissionKeys.ADMINISTRATION_MANAGE,
    PermissionKeys.ADMINISTRATION_DELETE,
  ],
} as const;
