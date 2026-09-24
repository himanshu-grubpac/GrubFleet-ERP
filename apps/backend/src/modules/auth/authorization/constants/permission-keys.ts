/** Permission keys enforced on administration HTTP routes. */
export const PermissionKeys = {
  ADMINISTRATION_VIEW: 'administration.view',
  ADMINISTRATION_MANAGE: 'administration.manage',
} as const;

export type PermissionKey =
  (typeof PermissionKeys)[keyof typeof PermissionKeys];
