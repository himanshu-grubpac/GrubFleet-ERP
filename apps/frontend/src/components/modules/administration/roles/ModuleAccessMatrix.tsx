"use client";

import { useMemo, useState } from "react";
import type { RoleEditorMatrixRow } from "@/lib/api/roles";
import {
  type ModuleCrudKind,
  type ModuleCrudMap,
  type ModuleCrudFlags,
  applyCrudToggle,
  countSelectedPermissions,
  emptyCrudFlags,
  grantableCrudKindsForActor,
  maxAssignablePermissionSlots,
} from "@/lib/administration/module-access-ui";

type ModuleAccessMatrixProps = {
  modules: RoleEditorMatrixRow[];
  crudMap: ModuleCrudMap;
  onChange: (moduleId: string, flags: ModuleCrudMap[string]) => void;
  readOnly?: boolean;
};

const CRUD_COLUMNS: Array<{
  key: ModuleCrudKind;
  label: string;
  short: string;
}> = [
  { key: "create", label: "Create", short: "C" },
  { key: "view", label: "Read", short: "R" },
  { key: "update", label: "Update", short: "U" },
  { key: "delete", label: "Delete", short: "D" },
  { key: "manage", label: "Admin", short: "A" },
];

function moduleSupportsCrud(mod: RoleEditorMatrixRow): boolean {
  return (
    mod.allowedLevels.includes("MANAGE") ||
    mod.allowedLevels.includes("FULL")
  );
}

export function ModuleAccessMatrix({
  modules,
  crudMap,
  onChange,
  readOnly = false,
}: ModuleAccessMatrixProps) {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const filteredModules = useMemo(() => {
    if (!query) {
      return modules;
    }
    return modules.filter(
      (mod) =>
        mod.label.toLowerCase().includes(query) ||
        mod.moduleId.toLowerCase().includes(query),
    );
  }, [modules, query]);

  const selectedCount = countSelectedPermissions(crudMap);
  const assignableTotal = maxAssignablePermissionSlots(modules);
  const progressPct =
    assignableTotal > 0
      ? Math.round((selectedCount / assignableTotal) * 100)
      : 0;

  const toggleModuleRow = (mod: RoleEditorMatrixRow, selectAll: boolean) => {
    if (readOnly) {
      return;
    }
    const grantable = grantableCrudKindsForActor(mod);
    const flags = emptyCrudFlags();
    if (selectAll) {
      for (const kind of grantable) {
        flags[kind] = true;
      }
    }
    onChange(mod.moduleId, flags);
  };

  const selectAllModules = () => {
    if (readOnly) {
      return;
    }
    for (const mod of modules) {
      toggleModuleRow(mod, true);
    }
  };

  const clearAll = () => {
    if (readOnly) {
      return;
    }
    for (const mod of modules) {
      onChange(mod.moduleId, emptyCrudFlags());
    }
  };

  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      role="region"
      aria-label="Module permissions"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules…"
          aria-label="Filter modules"
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
        />
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly ? (
            <>
              <button
                type="button"
                onClick={selectAllModules}
                disabled={assignableTotal === 0 || selectedCount >= assignableTotal}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={selectedCount === 0}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear all
              </button>
            </>
          ) : null}
          <div className="min-w-[160px] flex-1 sm:flex-none">
            <p className="text-xs font-medium text-slate-600">
              {selectedCount} of {assignableTotal} permissions selected
            </p>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuenow={selectedCount}
              aria-valuemin={0}
              aria-valuemax={assignableTotal}
            >
              <div
                className="h-full rounded-full bg-[#FE5720] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-4 py-3 text-left">
                Module
              </th>
              {CRUD_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="w-12 px-2 py-3 text-center"
                  title={col.label}
                >
                  {col.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredModules.length === 0 ? (
              <tr>
                <td
                  colSpan={CRUD_COLUMNS.length + 1}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No modules match your search.
                </td>
              </tr>
            ) : (
              filteredModules.map((mod) => (
                <ModuleCrudRow
                  key={mod.moduleId}
                  mod={mod}
                  flags={crudMap[mod.moduleId] ?? emptyCrudFlags()}
                  readOnly={readOnly}
                  onToggleModule={(selectAll) => toggleModuleRow(mod, selectAll)}
                  onToggleKind={(kind, checked) => {
                    const current = crudMap[mod.moduleId] ?? emptyCrudFlags();
                    onChange(
                      mod.moduleId,
                      applyCrudToggle(current, kind, checked),
                    );
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModuleCrudRow({
  mod,
  flags,
  readOnly,
  onToggleModule,
  onToggleKind,
}: {
  mod: RoleEditorMatrixRow;
  flags: ModuleCrudFlags;
  readOnly: boolean;
  onToggleModule: (selectAll: boolean) => void;
  onToggleKind: (kind: ModuleCrudKind, checked: boolean) => void;
}) {
  const grantable = grantableCrudKindsForActor(mod);
  const supportsCrud = moduleSupportsCrud(mod);
  const isCustom =
    mod.roleLevel === "CUSTOM" &&
    !flags.view &&
    !flags.create &&
    !flags.update &&
    !flags.delete &&
    !flags.manage;

  const rowSelected = CRUD_COLUMNS.filter(
    (col) => grantable.has(col.key) && flags[col.key],
  ).length;
  const rowTotal = CRUD_COLUMNS.filter((col) => grantable.has(col.key)).length;
  const allSelected = rowTotal > 0 && rowSelected === rowTotal;
  const someSelected = rowSelected > 0 && !allSelected;

  return (
    <tr className="hover:bg-slate-50/80">
      <td className="px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {!readOnly && rowTotal > 0 ? (
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = someSelected;
                  }
                }}
                onChange={() => onToggleModule(!allSelected)}
                aria-label={`Select all permissions for ${mod.label}`}
                className="h-3.5 w-3.5 rounded border-slate-300 text-[#FE5720] focus:ring-[#FE5720]"
              />
            </label>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">{mod.label}</span>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                {mod.moduleId}
              </code>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-500">
                {rowSelected} of {rowTotal} selected
              </span>
              {isCustom ? (
                <span className="text-xs text-amber-700">
                  Non-standard permissions — adjust CRUD columns.
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </td>
      {CRUD_COLUMNS.map((col) => {
        if (col.key !== "view" && !supportsCrud) {
          return (
            <td key={col.key} className="px-2 py-3 text-center text-slate-300">
              —
            </td>
          );
        }

        if (!grantable.has(col.key)) {
          return (
            <td key={col.key} className="px-2 py-3 text-center text-slate-300">
              —
            </td>
          );
        }

        return (
          <td key={col.key} className="px-2 py-3 text-center">
            <label className="inline-flex cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={flags[col.key]}
                disabled={readOnly}
                aria-label={`${col.label} — ${mod.label}`}
                onChange={(e) => onToggleKind(col.key, e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#FE5720] focus:ring-[#FE5720] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          </td>
        );
      })}
    </tr>
  );
}
