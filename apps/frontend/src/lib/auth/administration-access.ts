const ADMIN_WRITE_KEYS = [
  'administration.manage',
  'administration.create',
  'administration.update',
  'administration.delete',
] as const;

export function canMutateAdministration(permissions: Set<string>): boolean {
  return ADMIN_WRITE_KEYS.some((key) => permissions.has(key));
}
