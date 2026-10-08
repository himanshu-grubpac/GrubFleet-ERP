"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Button from "@/components/ui/GrubpacButton";
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

const ROLES_LIST_TITLE = "Roles & permissions";
const ROLES_LIST_DESCRIPTION =
  "Manage organization roles and CRUD permissions per module.";

export function AdministrationModule() {
  const router = useRouter();
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
  const parentRoleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const role of roles) {
      map.set(role.id, role.name);
    }
    return map;
  }, [roles]);
  const filteredRoles = useMemo(
    () =>
      roles.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [roles, searchQuery],
  );

  const createRoleAction = canCreate ? (
    <Button
      type="button"
      onClick={() => router.push("/administration/roles/new/")}
    >
      + Create role
    </Button>
  ) : undefined;

  if (!organizationId) {
    return (
      <DashboardLayout
        title={ROLES_LIST_TITLE}
        description={ROLES_LIST_DESCRIPTION}
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
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
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout
        title={ROLES_LIST_TITLE}
        description={ROLES_LIST_DESCRIPTION}
        action={createRoleAction}
      >
        <LoadingState
          label="Loading roles"
          variant="skeleton"
          skeleton="table"
        />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title={ROLES_LIST_TITLE}
        description={ROLES_LIST_DESCRIPTION}
        action={createRoleAction}
      >
        <ErrorState
          title="Failed to load roles"
          message={(error as Error).message}
          onRetry={refetch}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={ROLES_LIST_TITLE}
      description={ROLES_LIST_DESCRIPTION}
      action={createRoleAction}
    >
      <RolesListToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      {filteredRoles.length === 0 ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
          {searchQuery
            ? "No roles match your search."
            : "No roles yet. Create a role to get started."}
        </div>
      ) : (
        <div className="mt-4">
          <RolesListTable
            roles={filteredRoles}
            parentRoleNameById={parentRoleNameById}
            canUpdateRole={canUpdate}
            canDeleteRole={canDelete}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
