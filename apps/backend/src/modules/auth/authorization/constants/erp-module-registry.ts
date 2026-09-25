/** Phase 1 sidebar modules (no sub-nav / sub-permissions). */
export type ErpModuleDefinition = {
  id: string;
  label: string;
  sortOrder: number;
  /** When false, only `.view` is seeded (no `.manage`). */
  supportsManage: boolean;
};

export const ERP_MODULES: readonly ErpModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    sortOrder: 10,
    supportsManage: false,
  },
  {
    id: 'fleet_leasing',
    label: 'Fleet & Leasing',
    sortOrder: 20,
    supportsManage: true,
  },
  {
    id: 'asset_register',
    label: 'Asset Register',
    sortOrder: 30,
    supportsManage: true,
  },
  {
    id: 'workshop',
    label: 'Workshop',
    sortOrder: 40,
    supportsManage: true,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    sortOrder: 50,
    supportsManage: true,
  },
  {
    id: 'organisation',
    label: 'Organisation',
    sortOrder: 60,
    supportsManage: true,
  },
  {
    id: 'finance',
    label: 'Finance',
    sortOrder: 70,
    supportsManage: true,
  },
  {
    id: 'administration',
    label: 'Administration',
    sortOrder: 80,
    supportsManage: true,
  },
  {
    id: 'platform',
    label: 'Platform',
    sortOrder: 90,
    supportsManage: true,
  },
] as const;

export const ERP_MODULE_IDS = ERP_MODULES.map((m) => m.id);

export function getErpModuleById(
  moduleId: string,
): ErpModuleDefinition | undefined {
  return ERP_MODULES.find((m) => m.id === moduleId);
}

export function isKnownErpModuleId(moduleId: string): boolean {
  return ERP_MODULE_IDS.includes(moduleId);
}
