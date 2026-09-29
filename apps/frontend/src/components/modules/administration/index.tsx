"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { fetchRolesApi } from "@/lib/api/roles";
import { LoadingState, ErrorState } from "@/components/states/async-states";
import {
  canCreateRole,
  canDeleteRole,
  canUpdateRole,
} from "@/lib/auth/administration-access";
import {
  RolesListTable,
  RolesListToolbar,
} from "./roles/RolesListTable";

export function AdministrationModule() {
  const { token, organizationId, permissions } = useAuth();
  const canCreate = canCreateRole(permissions);
  const canUpdate = canUpdateRole(permissions);
  const canDelete = canDeleteRole(permissions);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: rolesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["roles", organizationId],
    queryFn: () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      return fetchRolesApi(token, organizationId);
    },
    enabled: !!token && !!organizationId,
  });

  const roles = useMemo(() => rolesData?.items ?? [], [rolesData?.items]);
  const filteredRoles = useMemo(
    () =>
      roles.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [roles, searchQuery],
  );

  if (!organizationId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-center gap-3">
          <Info className="h-6 w-6 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">
              Organization context required
            </h3>
            <p className="text-sm text-amber-700">
              Your account must belong to an active organization to manage
              roles and permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Roles & permissions
          </h1>
          <p className="text-sm text-slate-500">
            Manage organization roles and CRUD permissions per module.
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState
          label="Loading roles"
          variant="skeleton"
          skeleton="table"
        />
      ) : error ? (
        <ErrorState
          title="Failed to load roles"
          message={(error as Error).message}
          onRetry={refetch}
        />
      ) : (
        <>
          <RolesListToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            canCreateRole={canCreate}
          />
          {filteredRoles.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
              {searchQuery
                ? "No roles match your search."
                : "No roles yet. Create a role to get started."}
            </div>
          ) : (
            <RolesListTable
              roles={filteredRoles}
              canUpdateRole={canUpdate}
              canDeleteRole={canDelete}
            />
          )}
        </>
      )}
    </div>
  );
}
