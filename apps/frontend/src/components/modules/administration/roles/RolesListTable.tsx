"use client";

import Link from "next/link";
import { DataTable, type Column } from "@grubpac/ui-kit";
import { Shield, ShieldCheck } from "lucide-react";
import type { Role } from "@grubpac/shared-types";
import { countConfiguredModules } from "@/lib/administration/module-access-ui";
import { RoleRowActionsMenu } from "./RoleRowActionsMenu";

type RolesListTableProps = {
  roles: Role[];
  canUpdateRole: boolean;
  canDeleteRole: boolean;
};

export function RolesListTable({
  roles,
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <DataTable data={roles} columns={columns} getRowId={(row) => row.id} />
    </div>
  );
}

export function RolesListToolbar({
  searchQuery,
  onSearchChange,
  canCreateRole,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  canCreateRole: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        placeholder="Search roles by name or description..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
      />
      {canCreateRole ? (
        <Link
          href="/administration/roles/new/"
          className="inline-flex items-center justify-center rounded-lg bg-[#FE5720] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e94d1c]"
        >
          Create role
        </Link>
      ) : null}
    </div>
  );
}
