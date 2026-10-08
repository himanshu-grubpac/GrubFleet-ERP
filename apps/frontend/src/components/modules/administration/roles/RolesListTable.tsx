"use client";

import { DataTable, type Column } from "@grubpac/ui-kit";
import { Shield, ShieldCheck } from "lucide-react";
import type { Role } from "@grubpac/shared-types";
import { countConfiguredModules } from "@/lib/administration/module-access-ui";
import { RoleRowActionsMenu } from "./RoleRowActionsMenu";

type RolesListTableProps = {
  roles: Role[];
  parentRoleNameById: Map<string, string>;
  canUpdateRole: boolean;
  canDeleteRole: boolean;
};

export function RolesListTable({
  roles,
  parentRoleNameById,
  canUpdateRole,
  canDeleteRole,
}: RolesListTableProps) {
  const columns: Column<Role>[] = [
    {
      header: "Role",
      accessorKey: "name",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          {row.isSystem ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
          ) : (
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          )}
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            {row.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                {row.description}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "isActive",
      sortable: true,
      cell: ({ row }) => {
        const active = row.isActive !== false;
        return (
          <span
            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
              active
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {active ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      header: "Managed by",
      accessorKey: "parentRoleId",
      sortable: false,
      cell: ({ row }) => {
        if (!row.parentRoleId) {
          return (
            <span className="text-sm text-slate-500">Top-level</span>
          );
        }
        const parentName = parentRoleNameById.get(row.parentRoleId);
        return (
          <span className="text-sm text-slate-600">
            {parentName ?? "—"}
          </span>
        );
      },
    },
    {
      header: "Type",
      accessorKey: "isSystem",
      sortable: true,
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
            row.isSystem
              ? "bg-purple-100 text-purple-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {row.isSystem ? "System" : "Custom"}
        </span>
      ),
    },
    {
      header: "Modules",
      accessorKey: "moduleAccess",
      sortable: false,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {countConfiguredModules(row.moduleAccess, row.permissionKeys)}{" "}
          configured
        </span>
      ),
    },
    {
      header: "Scope",
      accessorKey: "scope",
      sortable: true,
      cell: ({ row }) => (
        <span className="text-sm capitalize text-slate-600">{row.scope}</span>
      ),
    },
    {
      header: "",
      accessorKey: "id",
      headerClassName: "text-right w-[56px]",
      className: "text-right",
      cell: ({ row }) => (
        <RoleRowActionsMenu
          roleId={row.id}
          roleName={row.name}
          isActive={row.isActive !== false}
          canEdit={!row.isSystem && canUpdateRole}
          canDeactivate={!row.isSystem && canUpdateRole}
          canDelete={!row.isSystem && canDeleteRole}
        />
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <DataTable data={roles} columns={columns} getRowId={(row) => row.id} />
    </div>
  );
}

export function RolesListToolbar({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <input
        type="search"
        placeholder="Search roles by name or description..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 w-full max-w-md rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
      />
    </div>
  );
}
