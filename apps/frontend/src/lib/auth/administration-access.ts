const ADMIN_WRITE_KEYS = [
  'administration.manage',
  'administration.create',
  'administration.update',
  'administration.delete',
] as const;

export function canMutateAdministration(permissions: Set<string>): boolean {
  return ADMIN_WRITE_KEYS.some((key) => permissions.has(key));
}

export function canCreateRole(permissions: Set<string>): boolean {
  return (
    permissions.has('administration.manage') ||
    permissions.has('administration.create')
  );
}

export function canUpdateRole(permissions: Set<string>): boolean {
  return (
    permissions.has('administration.manage') ||
    permissions.has('administration.update')
  );
}

export function canDeleteRole(permissions: Set<string>): boolean {
  return (
    permissions.has('administration.manage') ||
    permissions.has('administration.delete')
  );
}
