"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  ScrollText,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  KeyRound,
  Copy,
  Info,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganizationApi,
  fetchUsersApi,
  createUserApi,
  updateUserApi,
  fetchAuditLogsApi,
} from "@/lib/api/users";
import { LoadingState, ErrorState } from "@/components/states/async-states";
import type { UserMember, CreateUserResponse } from "@grubpac/shared-types";

export function OrganizationModule() {
  const { token, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"members" | "profile" | "audit">("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [createdUserResult, setCreatedUserResult] = useState<CreateUserResponse | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Add User Form State
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // 1. Fetch Organization Detail
  const {
    data: orgData,
    isLoading: isOrgLoading,
  } = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      return fetchOrganizationApi(token, organizationId);
    },
    enabled: !!token && !!organizationId,
  });

  // 2. Fetch Users in Organization
  const {
    data: usersData,
    isLoading: isUsersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users", organizationId],
    queryFn: () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      return fetchUsersApi(token, organizationId);
    },
    enabled: !!token && !!organizationId,
  });

  // 3. Fetch Audit Logs
  const {
    data: auditData,
    isLoading: isAuditLoading,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ["audit-logs", organizationId],
    queryFn: () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      return fetchAuditLogsApi(token, organizationId);
    },
    enabled: !!token && !!organizationId && activeTab === "audit",
  });

  // 4. Mutation: Create User
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      return createUserApi(token, {
        organizationId,
        email: newEmail.trim().toLowerCase(),
        fullName: newFullName.trim() || undefined,
        password: newPassword.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      setCreatedUserResult(res);
      setFeedback({
        type: "success",
        message: `User "${res.email}" added to organization successfully!`,
      });
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      queryClient.invalidateQueries({ queryKey: ["users", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs", organizationId] });
    },
    onError: (err: Error) => {
      setFeedback({
        type: "error",
        message: err.message || "Failed to create user.",
      });
    },
  });

  // 5. Mutation: Toggle User Status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      if (!token || !organizationId) throw new Error("Missing auth context");
      return updateUserApi(token, organizationId, userId, { isActive });
    },
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "User status updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["users", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs", organizationId] });
    },
    onError: (err: Error) => {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update user status.",
      });
    },
  });

  const usersList = usersData?.items || [];
  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!organizationId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-center gap-3">
          <Info className="h-6 w-6 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">Organization Context Required</h3>
            <p className="text-sm text-amber-700">
              Please ensure your account belongs to an active organization to view members and settings.
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
            {orgData?.name || "Organization & Team"}
          </h1>
          <p className="text-sm text-slate-500">
            Manage organization profile, team members, and view compliance audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchUsers();
              if (activeTab === "audit") refetchAudit();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
            Refresh
          </button>
          {activeTab === "members" && (
            <button
              onClick={() => {
                setCreatedUserResult(null);
                setIsAddUserModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FE5720] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e04815]"
            >
              <Plus className="h-4 w-4" />
              Add Member
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "members"
              ? "border-[#FE5720] text-[#FE5720]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="h-4 w-4" />
          Team Members ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "profile"
              ? "border-[#FE5720] text-[#FE5720]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Organization Profile
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "audit"
              ? "border-[#FE5720] text-[#FE5720]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <ScrollText className="h-4 w-4" />
          Audit Trail
        </button>
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

      {/* TAB 1: TEAM MEMBERS */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search members by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
              />
            </div>
          </div>

          {isUsersLoading ? (
            <LoadingState label="Loading team members..." />
          ) : usersError ? (
            <ErrorState
              title="Failed to load members"
              message={(usersError as Error).message}
              onRetry={refetchUsers}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-6 py-3.5">User</th>
                      <th className="px-6 py-3.5">Membership</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Joined Date</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          No members found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user: UserMember) => (
                        <tr key={user.id} className="transition hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                              {user.fullName || "—"}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail className="h-3 w-3 text-slate-400" />
                              {user.email}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 capitalize">
                              {user.membershipStatus}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {user.isActive ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Suspended
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-xs text-slate-500">
                            {user.joinedAt
                              ? new Date(user.joinedAt).toLocaleDateString()
                              : "—"}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  userId: user.id,
                                  isActive: !user.isActive,
                                })
                              }
                              disabled={toggleStatusMutation.isPending}
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                user.isActive
                                  ? "text-rose-700 hover:bg-rose-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {user.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5" /> Suspend
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5" /> Activate
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORGANIZATION PROFILE */}
      {activeTab === "profile" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {isOrgLoading ? (
            <LoadingState label="Loading organization profile..." />
          ) : orgData ? (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tenant Details</h3>
                <p className="text-xs text-slate-500">
                  Global parameters for the active tenant organization.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <span className="block text-xs font-semibold uppercase text-slate-500">
                    Organization Name
                  </span>
                  <span className="mt-1 block text-base font-semibold text-slate-900">
                    {orgData.name}
                  </span>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <span className="block text-xs font-semibold uppercase text-slate-500">
                    Organization Slug
                  </span>
                  <span className="mt-1 block font-mono text-sm text-slate-800">
                    {orgData.slug}
                  </span>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <span className="block text-xs font-semibold uppercase text-slate-500">
                    Organization ID
                  </span>
                  <span className="mt-1 block font-mono text-xs text-slate-600 truncate">
                    {orgData.id}
                  </span>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <span className="block text-xs font-semibold uppercase text-slate-500">
                    Status
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {orgData.isActive ? "Active Tenant" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              Recent Activity & Security Trail
            </h3>
            <span className="text-xs text-slate-500">
              Total events recorded: {auditData?.total || 0}
            </span>
          </div>

          {isAuditLoading ? (
            <LoadingState label="Loading audit logs..." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-6 py-3.5">Action</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Actor / IP</th>
                      <th className="px-6 py-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {!auditData?.items?.length ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-sans">
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditData.items.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70">
                          <td className="px-6 py-3 font-semibold text-slate-900">
                            {log.action}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                log.status === "SUCCESS"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-600">
                            {log.ipAddress || "system"}
                          </td>
                          <td className="px-6 py-3 text-slate-500 font-sans">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Add Team Member
                </h3>
                <p className="text-xs text-slate-500">
                  Invite a user to this organization.
                </p>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdUserResult ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Member Created Successfully!
                  </div>
                  <p className="mt-1 text-xs text-emerald-700">
                    The user has been provisioned and added as an active member.
                  </p>
                </div>

                {createdUserResult.temporaryPassword && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                      <KeyRound className="h-4 w-4 text-amber-600" />
                      Temporary Password (save now):
                    </div>
                    <div className="mt-2 flex items-center justify-between rounded bg-white p-2 text-xs font-mono font-bold text-slate-900 border border-amber-200">
                      <span>{createdUserResult.temporaryPassword}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            createdUserResult.temporaryPassword || ""
                          );
                          setCopiedPass(true);
                          setTimeout(() => setCopiedPass(false), 2000);
                        }}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    {copiedPass && (
                      <span className="mt-1 block text-[11px] text-emerald-700">
                        Copied to clipboard!
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setCreatedUserResult(null);
                      setIsAddUserModalOpen(false);
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createUserMutation.mutate();
                }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@domain.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Password (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to auto-generate temporary password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FE5720] focus:outline-none focus:ring-1 focus:ring-[#FE5720]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newEmail.trim() || createUserMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#FE5720] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e04815] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {createUserMutation.isPending && (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    )}
                    Add Member
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
