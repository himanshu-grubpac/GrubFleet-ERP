/** Provisional ERP module permission seeds — keys/names subject to product sign-off. */
export const PROVISIONAL_PERMISSION_MODULES = [
  'platform',
  'organization',
  'users',
  'roles',
  'fleet',
  'assets',
  'workshop',
  'inventory',
  'procurement',
  'finance',
] as const;

export type PermissionSeed = {
  key: string;
  module: string;
  action: 'VIEW' | 'MANAGE';
  description: string;
};

export function buildProvisionalPermissionCatalog(): PermissionSeed[] {
  const seeds: PermissionSeed[] = [];
  for (const module of PROVISIONAL_PERMISSION_MODULES) {
    for (const action of ['VIEW', 'MANAGE'] as const) {
      seeds.push({
        key: `${module}:${action}`,
        module,
        action,
        description: `[PROVISIONAL] ${action} access for ${module} module`,
      });
    }
  }
  return seeds;
}
