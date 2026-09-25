"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  Plus,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  Sliders,
  PenLine,
  XCircle,
  X,
  Info,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchRolesApi,
  fetchRoleEditorMatrixApi,
  createRoleApi,
  updateRoleApi,
  type RoleEditorMatrixRow,
} from "@/lib/api/roles";
import { LoadingState, ErrorState } from "@/components/states/async-states";
import type { Role } from "@grubpac/shared-types";
import { canMutateAdministration } from "@/lib/auth/administration-access";

export function AdministrationModule() {
  const { token, organizationId, permissions, refetchMe } = useAuth();
  const canWriteAdmin = canMutateAdministration(permissions);
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form states for creating a role
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRoleAccessMap, setNewRoleAccessMap] = useState<
    Record<string, "NONE" | "VIEW" | "MANAGE" | "FULL">
  >({});

  // Active matrix edit state for selected role
  const [editingAccessMap, setEditingAccessMap] = useState<
    Record<string, "NONE" | "VIEW" | "MANAGE" | "FULL">
  >({});
  const [isEditingMatrixDirty, setIsEditingMatrixDirty] = useState(false);

  // 1. Fetch Roles list
  const {
    data: rolesData,
    isLoading: isRolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ["roles", organizationId],
    queryFn: () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      return fetchRolesApi(token, organizationId);
    },
    enabled: !!token && !!organizationId,
  });

  // 2. Fetch Permission matrix for selected role
  const {
    data: matrixData,
    isLoading: isMatrixLoading,
    refetch: refetchMatrix,
  } = useQuery({
    queryKey: ["role-matrix", organizationId, selectedRole?.id],
    queryFn: async () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      const res = await fetchRoleEditorMatrixApi(
        token,
        organizationId,
        selectedRole?.id
      );
      // Synchronize edit map with backend response
      const initialMap: Record<string, "NONE" | "VIEW" | "MANAGE" | "FULL"> =
        {};
      res.modules.forEach((mod) => {
        if (
          mod.roleLevel === "NONE" ||
          mod.roleLevel === "VIEW" ||
          mod.roleLevel === "MANAGE" ||
          mod.roleLevel === "FULL"
        ) {
          initialMap[mod.moduleId] = mod.roleLevel;
        }
      });
      setEditingAccessMap(initialMap);
      setIsEditingMatrixDirty(false);
      return res;
    },
    enabled: !!token && !!organizationId,
  });

  // 3. Mutation: Update Role Access
  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId || !selectedRole) {
        throw new Error("No role selected");
      }
      if (!matrixData?.modules?.length) {
        throw new Error("Permission matrix not loaded");
      }
      const moduleAccess = matrixData.modules
        .map((mod) => {
          const fromEdit = editingAccessMap[mod.moduleId];
          const level =
            fromEdit ??
            (mod.roleLevel === "VIEW" ||
            mod.roleLevel === "MANAGE" ||
            mod.roleLevel === "FULL"
              ? mod.roleLevel
              : mod.roleLevel === "NONE"
              ? "NONE"
              : null);
          if (level === null) {
            throw new Error(
              `Module "${mod.label}" has a custom permission set. Pick View, Manage, or Full before saving.`,
            );
          }
          return { moduleId: mod.moduleId, accessLevel: level };
        })
        .filter((entry) => entry.accessLevel !== "NONE")
        .map((entry) => ({
          moduleId: entry.moduleId,
          accessLevel: entry.accessLevel as "VIEW" | "MANAGE" | "FULL",
        }));

      return updateRoleApi(token, organizationId, selectedRole.id, {
        moduleAccess,
      });
    },
    onSuccess: async () => {
      setFeedback({
        type: "success",
        message: `Role "${selectedRole?.name}" updated successfully!`,
      });
      setIsEditingMatrixDirty(false);
      queryClient.invalidateQueries({ queryKey: ["roles", organizationId] });
      queryClient.invalidateQueries({
        queryKey: ["role-matrix", organizationId, selectedRole?.id],
      });
      await refetchMe?.();
    },
    onError: (err: Error) => {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update role permissions.",
      });
    },
  });

  // 4. Mutation: Create Role
  const createRoleMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      const moduleAccess = Object.entries(newRoleAccessMap)
        .filter(([, level]) => level !== "NONE")
        .map(([moduleId, accessLevel]) => ({
          moduleId,
          accessLevel: accessLevel as "VIEW" | "MANAGE" | "FULL",
        }));

      return createRoleApi(token, {
        organizationId,
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || undefined,
        moduleAccess,
      });
    },
    onSuccess: async (newRole) => {
      setFeedback({
        type: "success",
        message: `New role "${newRole.name}" created successfully!`,
      });
      setIsCreateModalOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setNewRoleAccessMap({});
      queryClient.invalidateQueries({ queryKey: ["roles", organizationId] });
      setSelectedRole(newRole);
      await refetchMe?.();
    },
    onError: (err: Error) => {
      setFeedback({
        type: "error",
        message: err.message || "Failed to create role.",
      });
    },
  });

  const roles = useMemo(() => rolesData?.items ?? [], [rolesData?.items]);
  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-select first role on load if none selected
  React.useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      setSelectedRole(roles[0]);
    }
  }, [roles, selectedRole]);

  const handleAccessChange = (
    moduleId: string,
    level: "NONE" | "VIEW" | "MANAGE" | "FULL"
  ) => {
    setEditingAccessMap((prev) => ({
      ...prev,
      [moduleId]: level,
    }));
    setIsEditingMatrixDirty(true);
  };

  if (!organizationId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-center gap-3">
          <Info className="h-6 w-6 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">Organization Context Required</h3>
            <p className="text-sm text-amber-700">
              Please ensure your account belongs to an active organization to manage roles and permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Administration
          </h1>
          <p className="text-sm text-slate-500">
            Configure Role-Based Access Control (RBAC) and granular module permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchRoles();
              refetchMatrix();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
            Refresh
          </button>
          {canWriteAdmin && (
            <button
              onClick={() => {
                setNewRoleName("");
                setNewRoleDescription("");
                setNewRoleAccessMap({});
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FE5720] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e04815]"
            >
              <Plus className="h-4 w-4" />
              Create Role
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg p-4 text-sm ${
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
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isRolesLoading ? (
        <LoadingState label="Loading roles and permissions catalog..." />
      ) : rolesError ? (
        <ErrorState
          title="Failed to load roles"
          message={(rolesError as Error).message}
          onRetry={refetchRoles}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Roles Catalog List */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">
                  Roles ({filteredRoles.length})
                </h3>
                <span className="text-xs text-slate-400">Click to inspect</span>
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                />
              </div>

              {/* Role Cards */}
              <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
                {filteredRoles.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    No roles match your search.
                  </div>
                ) : (
                  filteredRoles.map((role) => {
                    const isSelected = selectedRole?.id === role.id;
                    return (
                      <div
                        key={role.id}
                        onClick={() => setSelectedRole(role)}
                        className={`cursor-pointer rounded-lg border p-3.5 transition ${
                          isSelected
                            ? "border-[#FE5720] bg-orange-50/40 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {role.isSystem ? (
                              <ShieldCheck className="h-4 w-4 text-purple-600" />
                            ) : (
                              <Shield className="h-4 w-4 text-blue-600" />
                            )}
                            <h4 className="font-medium text-slate-900 text-sm">
                              {role.name}
                            </h4>
                          </div>

                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                              role.isSystem
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {role.isSystem ? "System" : "Custom"}
                          </span>
                        </div>

                        {role.description && (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                            {role.description}
                          </p>
                        )}

                        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                          <span>
                            {role.moduleAccess?.length || 0} modules configured
                          </span>
                          <span className="capitalize">{role.scope}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Permission Matrix Editor */}
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {selectedRole ? (
                <div>
                  {/* Selected Role Header */}
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold text-slate-900">
                          {selectedRole.name}
                        </h2>
                        {selectedRole.isSystem ? (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                            <Lock className="h-3 w-3" /> System Role (Protected)
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Custom Role (Editable)
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedRole.description ||
                          "No description provided for this role."}
                      </p>
                    </div>

                    {!selectedRole.isSystem && canWriteAdmin && (
                      <button
                        onClick={() => updateRoleMutation.mutate()}
                        disabled={
                          !isEditingMatrixDirty || updateRoleMutation.isPending
                        }
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                          isEditingMatrixDirty && !updateRoleMutation.isPending
                            ? "bg-[#FE5720] hover:bg-[#e04815]"
                            : "cursor-not-allowed bg-slate-300"
                        }`}
                      >
                        {updateRoleMutation.isPending && (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </button>
                    )}
                  </div>

                  {/* Matrix Content */}
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">
                      Module Access Matrix
                    </h3>

                    {isMatrixLoading ? (
                      <div className="py-12 text-center text-sm text-slate-500">
                        <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#FE5720]" />
                        Loading permission matrix...
                      </div>
                    ) : matrixData?.modules ? (
                      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                        {matrixData.modules.map((mod: RoleEditorMatrixRow) => {
                          const isCustomRoleLevel =
                            mod.roleLevel === "CUSTOM" &&
                            editingAccessMap[mod.moduleId] === undefined;
                          const currentLevel =
                            editingAccessMap[mod.moduleId] ??
                            (mod.roleLevel === "VIEW" ||
                            mod.roleLevel === "MANAGE" ||
                            mod.roleLevel === "FULL"
                              ? mod.roleLevel
                              : "NONE");
                          const isSystemLocked =
                            selectedRole.isSystem || !canWriteAdmin;

                          return (
                            <div
                              key={mod.moduleId}
                              className="flex flex-col justify-between gap-3 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                            >
                              <div>
                                <h4 className="font-semibold text-slate-900 text-sm">
                                  {mod.label}
                                </h4>
                                <p className="text-xs text-slate-400">
                                  Module ID: <code className="text-slate-600">{mod.moduleId}</code>
                                  {isCustomRoleLevel && (
                                    <span className="ml-2 text-amber-700">
                                      Custom keys — choose a standard level to edit
                                    </span>
                                  )}
                                </p>
                              </div>

                              {/* Access Level Selector (NONE | VIEW | MANAGE | FULL) */}
                              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                                {(
                                  ["NONE", "VIEW", "MANAGE", "FULL"] as const
                                ).map((level) => {
                                    const isSelected = currentLevel === level;
                                    const isLevelAllowed =
                                      mod.allowedLevels.includes(level);

                                    return (
                                      <button
                                        key={level}
                                        type="button"
                                        disabled={
                                          isSystemLocked || !isLevelAllowed
                                        }
                                        onClick={() =>
                                          handleAccessChange(
                                            mod.moduleId,
                                            level
                                          )
                                        }
                                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                                          isSelected
                                            ? level === "NONE"
                                              ? "bg-white text-slate-700 shadow-xs"
                                              : level === "VIEW"
                                              ? "bg-blue-600 text-white shadow-xs"
                                              : level === "MANAGE"
                                              ? "bg-amber-600 text-white shadow-xs"
                                              : "bg-emerald-600 text-white shadow-xs"
                                            : "text-slate-600 hover:text-slate-900"
                                        } ${
                                          isSystemLocked || !isLevelAllowed
                                            ? "cursor-not-allowed opacity-60"
                                            : ""
                                        }`}
                                      >
                                        {level === "NONE" && (
                                          <XCircle className="h-3.5 w-3.5" />
                                        )}
                                        {level === "VIEW" && (
                                          <Eye className="h-3.5 w-3.5" />
                                        )}
                                        {level === "MANAGE" && (
                                          <PenLine className="h-3.5 w-3.5" />
                                        )}
                                        {level === "FULL" && (
                                          <Sliders className="h-3.5 w-3.5" />
                                        )}
                                        {level === "NONE"
                                          ? "None"
                                          : level === "VIEW"
                                          ? "View"
                                          : level === "MANAGE"
                                          ? "Manage"
                                          : "Full"}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-slate-500">
                  Select a role from the left list to view and manage its permissions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Create New Role
                </h3>
                <p className="text-xs text-slate-500">
                  Define a new role and grant module permissions.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createRoleMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fleet Operator, Finance Auditor"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of duties and granted access levels..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-700">
                  Initial Module Permissions
                </label>
                <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {matrixData?.modules?.map((mod: RoleEditorMatrixRow) => {
                    const currentLvl = newRoleAccessMap[mod.moduleId] || "NONE";
                    return (
                      <div
                        key={mod.moduleId}
                        className="flex items-center justify-between p-3"
                      >
                        <span className="text-sm font-medium text-slate-800">
                          {mod.label}
                        </span>
                        <div className="flex items-center gap-1 rounded bg-slate-100 p-0.5">
                          {(["NONE", "VIEW", "MANAGE", "FULL"] as const).map(
                            (lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() =>
                                setNewRoleAccessMap((prev) => ({
                                  ...prev,
                                  [mod.moduleId]: lvl,
                                }))
                              }
                              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                                currentLvl === lvl
                                  ? lvl === "NONE"
                                    ? "bg-white text-slate-700 shadow-xs"
                                    : lvl === "VIEW"
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : lvl === "MANAGE"
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {lvl === "NONE"
                                ? "None"
                                : lvl === "VIEW"
                                ? "View"
                                : lvl === "MANAGE"
                                ? "Manage"
                                : "Full"}
                            </button>
                          ),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRoleName.trim() || createRoleMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FE5720] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e04815] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {createRoleMutation.isPending && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
