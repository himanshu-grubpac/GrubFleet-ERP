import {
  ERP_MODULES,
  type ErpModuleDefinition,
} from '../../modules/auth/authorization/constants/erp-module-registry';
import { buildModulePermissionKey } from '../../modules/auth/authorization/module-access.util';

export type PermissionKind = 'view' | 'manage';

export type PermissionSeed = {
  key: string;
  module: string;
  action: PermissionKind;
  kind: PermissionKind;
  description: string;
};

function seedForModule(mod: ErpModuleDefinition): PermissionSeed[] {
  const seeds: PermissionSeed[] = [
    {
      key: buildModulePermissionKey(mod.id, 'view'),
      module: mod.id,
      action: 'view',
      kind: 'view',
      description: `View access for ${mod.label} module`,
    },
  ];
  if (mod.supportsManage) {
    seeds.push({
      key: buildModulePermissionKey(mod.id, 'manage'),
      module: mod.id,
      action: 'manage',
      kind: 'manage',
      description: `Manage access for ${mod.label} module`,
    });
  }
  return seeds;
}

/** Mohit Phase 1 module-level permission catalog (dot notation). */
export function buildPhase1PermissionCatalog(): PermissionSeed[] {
  return ERP_MODULES.flatMap(seedForModule);
}

/** @deprecated use buildPhase1PermissionCatalog */
export function buildProvisionalPermissionCatalog(): PermissionSeed[] {
  return buildPhase1PermissionCatalog();
}

/** Keys enforced on administration HTTP routes (users, roles, audit, permissions). */
export const ADMINISTRATION_HTTP_PERMISSION_KEYS = {
  VIEW: 'administration.view',
  MANAGE: 'administration.manage',
} as const;

/**
 * Legacy `{module}:{ACTION}` → Phase 1 dot keys (data migration).
 * Multiple legacy keys may map to the same new key.
 */
export const LEGACY_PERMISSION_KEY_MAP: Record<string, string> = {
  'platform:VIEW': 'platform.view',
  'platform:MANAGE': 'platform.manage',
  'organization:VIEW': 'organisation.view',
  'organization:MANAGE': 'organisation.manage',
  'organizations:VIEW': 'administration.view',
  'organizations:MANAGE': 'administration.manage',
  'users:VIEW': 'administration.view',
  'users:MANAGE': 'administration.manage',
  'roles:VIEW': 'administration.view',
  'roles:MANAGE': 'administration.manage',
  'permissions:VIEW': 'administration.view',
  'audit:VIEW': 'administration.view',
  'fleet:VIEW': 'fleet_leasing.view',
  'fleet:MANAGE': 'fleet_leasing.manage',
  'assets:VIEW': 'asset_register.view',
  'assets:MANAGE': 'asset_register.manage',
  'workshop:VIEW': 'workshop.view',
  'workshop:MANAGE': 'workshop.manage',
  'inventory:VIEW': 'inventory.view',
  'inventory:MANAGE': 'inventory.manage',
  'finance:VIEW': 'finance.view',
  'finance:MANAGE': 'finance.manage',
};
