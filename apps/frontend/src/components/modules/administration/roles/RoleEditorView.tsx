"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import {
  createRoleApi,
  fetchRoleByIdApi,
  fetchRoleEditorMatrixApi,
  fetchRolesApi,
  updateRoleApi,
} from "@/lib/api/roles";
import { LoadingState, ErrorState } from "@/components/states/async-states";
import {
  canCreateRole,
  canManageAdministration,
  canUpdateRole,
} from "@/lib/auth/administration-access";
import {
  buildPermissionKeysFromCrudMap,
  initCrudMapFromMatrix,
  type ModuleCrudMap,
} from "@/lib/administration/module-access-ui";
import { ModuleAccessMatrix } from "./ModuleAccessMatrix";
import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

type RoleEditorMode = "create" | "edit";

type RoleEditorViewProps = {
  mode: RoleEditorMode;
  roleId?: string;
  /** Read-only permissions page (from row menu “View permissions”). */
  viewOnly?: boolean;
};

export function RoleEditorView({ mode, roleId, viewOnly = false }: RoleEditorViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, permissions, refetchMe } = useAuth();
  const isEdit = mode === "edit";
  const canWriteRole = isEdit
    ? canUpdateRole(permissions)
    : canCreateRole(permissions);
  const canSetRootRole = canManageAdministration(permissions);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentRoleId, setParentRoleId] = useState<string | null>(null);
  const [crudMap, setCrudMap] = useState<ModuleCrudMap>({});
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    data: roleMeta,
    isLoading: roleLoading,
    error: roleError,
    refetch: refetchRole,
  } = useQuery({
    queryKey: ["role", organizationId, roleId],
    queryFn: () => {
      if (!token || !organizationId || !roleId) {
        throw new Error("Missing auth context");
      }
      return fetchRoleByIdApi(token, organizationId, roleId);
    },
    enabled: !!token && !!organizationId && isEdit && !!roleId,
  });

  const {
    data: matrixData,
    isLoading: matrixLoading,
    error: matrixError,
    refetch: refetchMatrix,
  } = useQuery({
    queryKey: ["role-matrix", organizationId, isEdit ? roleId : "new"],
    queryFn: async () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      return fetchRoleEditorMatrixApi(
        token,
        organizationId,
        isEdit ? roleId : undefined,
      );
    },
    enabled: !!token && !!organizationId && (!isEdit || !!roleId),
  });

  const {
    data: rolesCatalog,
    isLoading: rolesCatalogLoading,
    error: rolesCatalogError,
    refetch: refetchRolesCatalog,
  } = useQuery({
    queryKey: ["roles", organizationId],
    queryFn: () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      return fetchRolesApi(token, organizationId);
    },
    enabled: !!token && !!organizationId,
  });

  const parentRoleOptions = useMemo(() => {
    const items = rolesCatalog?.items ?? [];
    return items
      .filter((role) => !(isEdit && roleId && role.id === roleId))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rolesCatalog?.items, isEdit, roleId]);

  const parentRoleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const role of rolesCatalog?.items ?? []) {
      map.set(role.id, role.name);
    }
    return map;
  }, [rolesCatalog?.items]);

  const resolvedParentLabel = useMemo(() => {
    if (!parentRoleId) {
      return "Top-level (no parent role)";
    }
    return parentRoleNameById.get(parentRoleId) ?? "—";
  }, [parentRoleId, parentRoleNameById]);

  const hierarchyValid =
    canSetRootRole || parentRoleId !== null;

  useEffect(() => {
    if (!matrixData?.modules?.length) {
      return;
    }
    setCrudMap(
      initCrudMapFromMatrix(
        matrixData.modules,
        roleMeta?.permissionKeys,
      ),
    );
    setDirty(false);
  }, [matrixData, roleMeta?.permissionKeys]);

  useEffect(() => {
    if (roleMeta) {
      setName(roleMeta.name);
      setDescription(roleMeta.description ?? "");
      setParentRoleId(roleMeta.parentRoleId ?? null);
    }
  }, [roleMeta]);

  const readOnly =
    viewOnly ||
    (isEdit && (!canWriteRole || roleMeta?.isSystem === true));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      if (!matrixData?.modules?.length) {
        throw new Error("Permission matrix not loaded");
      }
      const permissionKeys = buildPermissionKeysFromCrudMap(
        matrixData.modules,
        crudMap,
      );

      if (permissionKeys.length === 0) {
        throw new Error(
          "Select at least one permission (e.g. Read on a module).",
        );
      }

      if (isEdit) {
        if (!roleId) {
          throw new Error("Role id is required");
        }
        return updateRoleApi(token, organizationId, roleId, {
          name: name.trim(),
          description: description.trim() || undefined,
          parentRoleId,
          permissionKeys,
        });
      }

      if (!hierarchyValid) {
        throw new Error(
          "Select a parent role in Organisation hierarchy (top-level roles require administration.manage).",
        );
      }

      return createRoleApi(token, {
        organizationId,
        name: name.trim(),
        description: description.trim() || undefined,
        parentRoleId,
        permissionKeys,
      });
    },
    onSuccess: async (savedRole) => {
      setFeedback({
        type: "success",
        message: isEdit
          ? `Role "${savedRole.name}" updated successfully.`
          : `Role "${savedRole.name}" created successfully.`,
      });
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["roles", organizationId] });
      if (isEdit && roleId) {
        await queryClient.invalidateQueries({
          queryKey: ["role", organizationId, roleId],
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ["role-matrix", organizationId],
      });
      await refetchMe?.();
      if (!isEdit) {
        router.push("/administration/");
      }
    },
    onError: (err: Error) => {
      setFeedback({
        type: "error",
        message: err.message || "Failed to save role.",
      });
    },
  });

  const handleCrudChange = (
    moduleId: string,
    flags: ModuleCrudMap[string],
  ) => {
    setCrudMap((prev) => ({ ...prev, [moduleId]: flags }));
    setDirty(true);
  };

  if (!organizationId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Organization context is required to manage roles.
      </div>
    );
  }

  if (isEdit && !roleId) {
    return (
      <ErrorState
        title="Role not specified"
        message="Open a role from the list or use a valid roleId query parameter."
      />
    );
  }

  if (isEdit && roleLoading) {
    return <LoadingState label="Loading role…" />;
  }

  if (isEdit && roleError) {
    return (
      <ErrorState
        title="Failed to load role"
        message={(roleError as Error).message}
        onRetry={refetchRole}
      />
    );
  }

  if (isEdit && !roleLoading && !roleMeta) {
    return (
      <ErrorState
        title="Role not found"
        message="This role does not exist in your organization or you cannot access it."
      />
    );
  }

  const pageTitle = isEdit ? roleMeta?.name ?? "Edit role" : "Create role";
  const isSystemRole = Boolean(roleMeta?.isSystem);
  const pageDescription = isEdit
    ? "Update role details and tick CRUD permissions per module."
    : "Define a new role and assign Create, Read, Update, Delete, and Admin access per module.";

  const formActions = !readOnly ? (
    <>
      <button
        type="button"
        onClick={() => router.push("/administration/")}
        disabled={saveMutation.isPending}
        className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel
      </button>
      <Button
        type="button"
        loading={saveMutation.isPending}
        disabled={
          !name.trim() ||
          !hierarchyValid ||
          saveMutation.isPending ||
          rolesCatalogLoading ||
          (isEdit && !dirty)
        }
        onClick={() => saveMutation.mutate()}
        className="h-10 px-5"
      >
        {isEdit ? "Save changes" : "Create role"}
      </Button>
    </>
  ) : undefined;

  return (
    <OrganizationFormLayout
      title={pageTitle}
      description={pageDescription}
      backLink={{ href: "/administration/", label: "Back to roles" }}
      actions={formActions}
    >
      {isSystemRole ? (
        <span className="mb-4 inline-flex items-center gap-1 rounded bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
          <Lock className="h-3 w-3" />
          System role — view only
        </span>
      ) : null}

      {feedback ? (
        <div
          className={`mb-4 flex items-center justify-between rounded-lg p-4 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {matrixLoading ? (
        <LoadingState label="Loading module permission matrix…" />
      ) : matrixError ? (
        <ErrorState
          title="Failed to load permissions"
          message={(matrixError as Error).message}
          onRetry={refetchMatrix}
        />
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!readOnly) {
              saveMutation.mutate();
            }
          }}
        >
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Role details
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  Role name *
                </label>
                <input
                  type="text"
                  required
                  disabled={readOnly}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="e.g. Fleet operator"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720] disabled:bg-slate-50"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  Organisation hierarchy
                  {!canSetRootRole ? (
                    <span className="ml-0.5 text-red-500">*</span>
                  ) : null}
                </label>
                {rolesCatalogLoading ? (
                  <p className="mt-1 text-sm text-slate-500">
                    Loading roles…
                  </p>
                ) : rolesCatalogError ? (
                  <div className="mt-1 space-y-2">
                    <p className="text-sm text-red-600">
                      {(rolesCatalogError as Error).message}
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchRolesCatalog()}
                      className="text-sm font-medium text-[#FE5720] hover:underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : readOnly ? (
                  <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {resolvedParentLabel}
                  </p>
                ) : (
                  <select
                    value={parentRoleId ?? ""}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = e.target.value.trim();
                      setParentRoleId(next.length > 0 ? next : null);
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720] disabled:bg-slate-50"
                  >
                    {canSetRootRole ? (
                      <option value="">Top-level (no parent role)</option>
                    ) : (
                      <option value="" disabled>
                        Select parent role…
                      </option>
                    )}
                    {parentRoleId &&
                    !parentRoleOptions.some((r) => r.id === parentRoleId) ? (
                      <option value={parentRoleId}>
                        {resolvedParentLabel}
                      </option>
                    ) : null}
                    {parentRoleOptions.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                )}
                {!readOnly && !canSetRootRole ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Choose the role that manages this role in your organisation
                    tree.
                  </p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  disabled={readOnly}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Brief summary of responsibilities and access…"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720] disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Module access
              </h2>
              {matrixLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-[#FE5720]" />
              ) : null}
            </div>
            {matrixData?.modules ? (
              <ModuleAccessMatrix
                modules={matrixData.modules}
                crudMap={crudMap}
                onChange={handleCrudChange}
                readOnly={readOnly}
              />
            ) : null}
          </div>
        </form>
      )}
    </OrganizationFormLayout>
  );
}
