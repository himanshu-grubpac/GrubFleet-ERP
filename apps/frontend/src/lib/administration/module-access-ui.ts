import type { Role } from "@grubpac/shared-types";
import type { ModuleAccessLevel } from "@grubpac/shared-types";
import type { RoleEditorMatrixRow } from "@/lib/api/roles";

/** CRUD + module admin — maps to `{moduleId}.{kind}` permission keys on the backend. */
export const MODULE_CRUD_KINDS = [
  "create",
  "view",
  "update",
  "delete",
  "manage",
] as const;

export type ModuleCrudKind = (typeof MODULE_CRUD_KINDS)[number];

export type ModuleCrudFlags = Record<ModuleCrudKind, boolean>;

export type ModuleCrudMap = Record<string, ModuleCrudFlags>;

const EMPTY_FLAGS: ModuleCrudFlags = {
  create: false,
  view: false,
  update: false,
  delete: false,
  manage: false,
};

export function buildModulePermissionKey(
  moduleId: string,
  kind: ModuleCrudKind,
): string {
  return `${moduleId}.${kind}`;
}

export function emptyCrudFlags(): ModuleCrudFlags {
  return { ...EMPTY_FLAGS };
}

/** Grantable CRUD toggles for the actor on a module (from editor-matrix actorMaxLevel). */
export function grantableCrudKindsForActor(
  mod: RoleEditorMatrixRow,
): Set<ModuleCrudKind> {
  const level = mod.actorMaxLevel;
  const grantable = new Set<ModuleCrudKind>();

  if (level === "NONE") {
    return grantable;
  }

  grantable.add("view");

  const modSupportsManage =
    mod.allowedLevels.includes("MANAGE") ||
    mod.allowedLevels.includes("FULL");

  if (!modSupportsManage) {
    return grantable;
  }

  if (
    level === "MANAGE" ||
    level === "FULL" ||
    level === "CUSTOM"
  ) {
    grantable.add("create");
    grantable.add("update");
    grantable.add("delete");
  }

  if (level === "FULL" || level === "CUSTOM") {
    grantable.add("manage");
  }

  return grantable;
}

export function crudFlagsFromRoleLevel(
  roleLevel: ModuleAccessLevel,
  supportsManage: boolean,
): ModuleCrudFlags {
  const flags = emptyCrudFlags();

  if (roleLevel === "NONE") {
    return flags;
  }

  flags.view = true;

  if (!supportsManage) {
    return flags;
  }

  if (roleLevel === "MANAGE" || roleLevel === "FULL") {
    flags.create = true;
    flags.update = true;
    flags.delete = true;
  }

  if (roleLevel === "FULL") {
    flags.manage = true;
  }

  return flags;
}

export function parseCrudFlagsForModule(
  moduleId: string,
  permissionKeys: string[],
): ModuleCrudFlags {
  const prefix = `${moduleId}.`;
  const flags = emptyCrudFlags();
  for (const key of permissionKeys) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    const suffix = key.slice(prefix.length) as ModuleCrudKind;
    if (suffix in flags) {
      flags[suffix] = true;
    }
  }
  return flags;
}

export function initCrudMapFromMatrix(
  modules: RoleEditorMatrixRow[],
  permissionKeys?: string[],
): ModuleCrudMap {
  const map: ModuleCrudMap = {};
  const hasKeys = Boolean(permissionKeys?.length);

  for (const mod of modules) {
    if (hasKeys && permissionKeys) {
      map[mod.moduleId] = parseCrudFlagsForModule(
        mod.moduleId,
        permissionKeys,
      );
      continue;
    }

    const supportsManage =
      mod.allowedLevels.includes("MANAGE") ||
      mod.allowedLevels.includes("FULL");

    if (mod.roleLevel === "CUSTOM") {
      map[mod.moduleId] = emptyCrudFlags();
    } else {
      map[mod.moduleId] = crudFlagsFromRoleLevel(
        mod.roleLevel,
        supportsManage,
      );
    }
  }

  return map;
}

export function applyCrudToggle(
  current: ModuleCrudFlags,
  kind: ModuleCrudKind,
  checked: boolean,
): ModuleCrudFlags {
  const next = { ...current, [kind]: checked };

  if (kind === "view" && !checked) {
    next.create = false;
    next.update = false;
    next.delete = false;
    next.manage = false;
  }

  if (checked && (kind === "create" || kind === "update" || kind === "delete")) {
    next.view = true;
  }

  if (kind === "manage" && checked) {
    next.view = true;
    next.create = true;
    next.update = true;
    next.delete = true;
    next.manage = true;
  }

  return next;
}

export function buildPermissionKeysFromCrudMap(
  modules: RoleEditorMatrixRow[],
  crudMap: ModuleCrudMap,
): string[] {
  const keys = new Set<string>();

  for (const mod of modules) {
    const flags = crudMap[mod.moduleId] ?? emptyCrudFlags();
    for (const kind of MODULE_CRUD_KINDS) {
      if (!flags[kind]) {
        continue;
      }
      if (
        kind !== "view" &&
        !mod.allowedLevels.includes("MANAGE") &&
        !mod.allowedLevels.includes("FULL")
      ) {
        continue;
      }
      keys.add(buildModulePermissionKey(mod.moduleId, kind));
    }
  }

  return [...keys].sort();
}

export function countSelectedPermissions(crudMap: ModuleCrudMap): number {
  let count = 0;
  for (const flags of Object.values(crudMap)) {
    for (const kind of MODULE_CRUD_KINDS) {
      if (flags[kind]) {
        count += 1;
      }
    }
  }
  return count;
}

export function countModulesWithAccess(crudMap: ModuleCrudMap): number {
  return Object.values(crudMap).filter((flags) => flags.view).length;
}

export function countConfiguredModules(
  moduleAccess: Role["moduleAccess"] | undefined,
  permissionKeys?: string[] | undefined,
): number {
  if (permissionKeys && permissionKeys.length > 0) {
    const moduleIds = new Set<string>();
    for (const key of permissionKeys) {
      const dot = key.indexOf(".");
      if (dot > 0) {
        moduleIds.add(key.slice(0, dot));
      }
    }
    return moduleIds.size;
  }

  return (
    moduleAccess?.filter(
      (entry) =>
        entry.accessLevel === "VIEW" ||
        entry.accessLevel === "MANAGE" ||
        entry.accessLevel === "FULL" ||
        entry.accessLevel === "CUSTOM",
    ).length ?? 0
  );
}

export function maxAssignablePermissionSlots(
  modules: RoleEditorMatrixRow[],
): number {
  let total = 0;
  for (const mod of modules) {
    const grantable = grantableCrudKindsForActor(mod);
    total += grantable.size;
  }
  return total;
}
