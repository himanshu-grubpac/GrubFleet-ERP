export const OrganisationPermissionKeys = {
  VIEW: 'organisation.view',
  CREATE: 'organisation.create',
  UPDATE: 'organisation.update',
  DELETE: 'organisation.delete',
  MANAGE: 'organisation.manage',
} as const;

export const OrganisationWriteAny = {
  CREATE: [
    OrganisationPermissionKeys.MANAGE,
    OrganisationPermissionKeys.CREATE,
  ],
  UPDATE: [
    OrganisationPermissionKeys.MANAGE,
    OrganisationPermissionKeys.UPDATE,
  ],
  DELETE: [
    OrganisationPermissionKeys.MANAGE,
    OrganisationPermissionKeys.DELETE,
  ],
} as const;
