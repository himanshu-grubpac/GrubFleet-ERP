import {
  ERP_MODULES,
  getErpModuleById,
  isKnownErpModuleId,
} from './constants/erp-module-registry';

export type ModuleAccessLevel = 'NONE' | 'VIEW' | 'MANAGE' | 'FULL' | 'CUSTOM';

export type ModuleAccessEntry = {
  moduleId: string;
  accessLevel: Exclude<ModuleAccessLevel, 'CUSTOM'>;
};

const LEVEL_RANK: Record<ModuleAccessLevel, number> = {
  NONE: 0,
  VIEW: 1,
  MANAGE: 2,
  FULL: 3,
  CUSTOM: 4,
};

export type ModulePermissionKind =
  'view' | 'create' | 'update' | 'delete' | 'manage';

/** Permission key format: `{module_id}.{kind}` */
export function buildModulePermissionKey(
  moduleId: string,
  kind: ModulePermissionKind,
): string {
  return `${moduleId}.${kind}`;
}

const CRUD_KINDS: ModulePermissionKind[] = ['create', 'update', 'delete'];

export function parseModulePermissionKey(key: string): {
  moduleId: string;
  kind: ModulePermissionKind | 'sub';
} | null {
  const dot = key.lastIndexOf('.');
  if (dot <= 0) {
    return null;
  }
  const moduleId = key.slice(0, dot);
  const suffix = key.slice(dot + 1);
  if (
    suffix === 'view' ||
    suffix === 'manage' ||
    suffix === 'create' ||
    suffix === 'update' ||
    suffix === 'delete'
  ) {
    return { moduleId, kind: suffix };
  }
  return { moduleId, kind: 'sub' };
}

export function allCatalogPermissionKeys(): string[] {
  const keys: string[] = [];
  for (const mod of ERP_MODULES) {
    keys.push(buildModulePermissionKey(mod.id, 'view'));
    if (mod.supportsManage) {
      for (const kind of CRUD_KINDS) {
        keys.push(buildModulePermissionKey(mod.id, kind));
      }
      keys.push(buildModulePermissionKey(mod.id, 'manage'));
    }
  }
  return keys;
}

export function keysForModuleLevel(
  moduleId: string,
  level: Exclude<ModuleAccessLevel, 'NONE' | 'CUSTOM'>,
): string[] {
  const mod = getErpModuleById(moduleId);
  if (!mod) {
    return [];
  }
  if (level === 'VIEW') {
    return [buildModulePermissionKey(moduleId, 'view')];
  }
  const keys = [buildModulePermissionKey(moduleId, 'view')];
  if (!mod.supportsManage) {
    return keys;
  }
  if (level === 'MANAGE' || level === 'FULL') {
    for (const kind of CRUD_KINDS) {
      keys.push(buildModulePermissionKey(moduleId, kind));
    }
  }
  if (level === 'FULL') {
    keys.push(buildModulePermissionKey(moduleId, 'manage'));
  }
  return keys;
}

export function expandModuleAccess(entries: ModuleAccessEntry[]): string[] {
  const keySet = new Set<string>();
  for (const entry of entries) {
    if (entry.accessLevel === 'NONE') {
      continue;
    }
    if (!isKnownErpModuleId(entry.moduleId)) {
      continue;
    }
    for (const key of keysForModuleLevel(entry.moduleId, entry.accessLevel)) {
      keySet.add(key);
    }
  }
  return [...keySet].sort();
}

function moduleLevelFromKeys(
  moduleId: string,
  keysForModule: string[],
): ModuleAccessLevel {
  if (keysForModule.length === 0) {
    return 'NONE';
  }
  const mod = getErpModuleById(moduleId);
  const viewKey = buildModulePermissionKey(moduleId, 'view');
  const manageKey = buildModulePermissionKey(moduleId, 'manage');
  const crudKeys = CRUD_KINDS.map((k) => buildModulePermissionKey(moduleId, k));

  const hasView = keysForModule.includes(viewKey);
  const hasManage =
    Boolean(mod?.supportsManage) && keysForModule.includes(manageKey);
  const hasCrud = crudKeys.every((k) => keysForModule.includes(k));

  const known = new Set([viewKey, manageKey, ...crudKeys]);
  const extras = keysForModule.filter((k) => !known.has(k));
  if (extras.length > 0) {
    return 'CUSTOM';
  }

  /** Legacy roles: view + manage only (before CRUD keys existed). */
  if (hasManage && hasView && !hasCrud) {
    return 'FULL';
  }
  if (hasManage && hasView && hasCrud) {
    return 'FULL';
  }
  if (hasCrud && hasView && !hasManage) {
    return 'MANAGE';
  }
  if (hasView && !hasManage && !hasCrud) {
    return 'VIEW';
  }
  return 'CUSTOM';
}

export function deriveModuleAccessFromKeys(
  permissionKeys: string[],
): ModuleAccessEntry[] {
  return deriveModuleAccessFromKeysDetailed(permissionKeys)
    .filter(
      (row): row is ModuleAccessEntry =>
        row.accessLevel === 'VIEW' ||
        row.accessLevel === 'MANAGE' ||
        row.accessLevel === 'FULL',
    )
    .map((row) => ({
      moduleId: row.moduleId,
      accessLevel: row.accessLevel,
    }));
}

/** Includes CUSTOM rows when present (role editor / diagnostics). */
export function moduleAccessForNav(
  permissionKeys: string[],
): Array<{ moduleId: string; accessLevel: ModuleAccessLevel }> {
  return deriveModuleAccessFromKeysDetailed(permissionKeys).filter(
    (row) => row.accessLevel !== 'NONE',
  );
}

export function deriveModuleAccessFromKeysDetailed(
  permissionKeys: string[],
): Array<{ moduleId: string; accessLevel: ModuleAccessLevel }> {
  const byModule = new Map<string, string[]>();
  for (const key of permissionKeys) {
    const parsed = parseModulePermissionKey(key);
    if (!parsed || !isKnownErpModuleId(parsed.moduleId)) {
      continue;
    }
    const list = byModule.get(parsed.moduleId) ?? [];
    list.push(key);
    byModule.set(parsed.moduleId, list);
  }

  return ERP_MODULES.map((mod) => ({
    moduleId: mod.id,
    accessLevel: moduleLevelFromKeys(mod.id, byModule.get(mod.id) ?? []),
  }));
}

export function resolveModuleAccessLevel(
  permissionKeys: string[],
  moduleId: string,
): ModuleAccessLevel {
  const keysForModule = permissionKeys.filter((k) =>
    k.startsWith(`${moduleId}.`),
  );
  return moduleLevelFromKeys(moduleId, keysForModule);
}

export function maxModuleAccessLevel(
  a: ModuleAccessLevel,
  b: ModuleAccessLevel,
): ModuleAccessLevel {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

/** Actor may grant up to their own effective level per module (CUSTOM excluded Phase 1). */
export function assertModuleAccessDelegatable(
  actorKeys: string[],
  requested: ModuleAccessEntry[],
): { ok: true } | { ok: false; violations: ModuleAccessEntry[] } {
  const violations: ModuleAccessEntry[] = [];
  for (const entry of requested) {
    if (entry.accessLevel === 'NONE') {
      continue;
    }
    if (!isKnownErpModuleId(entry.moduleId)) {
      violations.push(entry);
      continue;
    }
    const actorLevel = resolveModuleAccessLevel(actorKeys, entry.moduleId);
    const actorRank =
      actorLevel === 'CUSTOM' ? LEVEL_RANK.FULL : LEVEL_RANK[actorLevel];
    const requestedRank = LEVEL_RANK[entry.accessLevel];
    if (requestedRank > actorRank) {
      violations.push(entry);
    }
  }
  if (violations.length > 0) {
    return { ok: false, violations };
  }
  return { ok: true };
}

/** Includes sub-permissions under a module prefix (Phase 2). */
export function permissionKeysImpliedByModuleAccess(
  heldKeys: string[],
  moduleId: string,
  targetLevel: Exclude<ModuleAccessLevel, 'NONE' | 'CUSTOM'>,
): boolean {
  const expanded = new Set(keysForModuleLevel(moduleId, targetLevel));
  const heldSet = new Set(heldKeys);
  for (const key of expanded) {
    if (!heldSet.has(key)) {
      return false;
    }
  }
  const prefix = `${moduleId}.`;
  for (const key of heldKeys) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    const parsed = parseModulePermissionKey(key);
    if (parsed?.kind === 'sub' && targetLevel === 'FULL') {
      if (!heldSet.has(key)) {
        return false;
      }
    }
  }
  return true;
}

/** Levels the role editor may offer for a module given actor max level. */
export function allowedLevelsForActor(
  actorMaxLevel: ModuleAccessLevel,
  moduleSupportsManage: boolean,
): Array<'NONE' | 'VIEW' | 'MANAGE' | 'FULL'> {
  const levels: Array<'NONE' | 'VIEW' | 'MANAGE' | 'FULL'> = ['NONE'];
  if (actorMaxLevel === 'CUSTOM') {
    if (moduleSupportsManage) {
      return ['NONE', 'VIEW', 'MANAGE', 'FULL'];
    }
    return ['NONE', 'VIEW'];
  }
  const rank = actorMaxLevel === 'NONE' ? 0 : LEVEL_RANK[actorMaxLevel];
  if (rank >= LEVEL_RANK.VIEW) {
    levels.push('VIEW');
  }
  if (moduleSupportsManage && rank >= LEVEL_RANK.MANAGE) {
    levels.push('MANAGE');
  }
  if (moduleSupportsManage && rank >= LEVEL_RANK.FULL) {
    levels.push('FULL');
  }
  return levels;
}
