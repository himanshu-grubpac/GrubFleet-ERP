"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";

import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  invalidateAmcScheduleCaches,
  invalidateAmcTierCaches,
} from "@/lib/query/invalidate-domain-caches";

import { ApiClientError } from "@/lib/api/client";
import {
  fetchWorkshopAmcTiersApi,
  fetchWorkshopMaintenanceSchedulesApi,
  updateWorkshopAmcTierStatusApi,
  updateWorkshopMaintenanceScheduleStatusApi,
  type WorkshopAmcTierListItem,
  type WorkshopMaintenanceScheduleListItem,
} from "@/lib/api/workshop/amc";
import {
  workshopAmcScheduleCreateHref,
  workshopAmcScheduleDetailHref,
  workshopAmcScheduleEditHref,
  workshopAmcTierCreateHref,
  workshopAmcTierDetailHref,
  workshopAmcTierEditHref,
} from "@/lib/navigation/workshop-static-routes";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

function formatAmcTierRowCopyText(tier: WorkshopAmcTierListItem): string {
  const parts = [
    tier.name,
    tier.priceDisplayLabel,
    `${tier.subscriberCount} subscribers`,
    tier.status === "active" ? "Active" : "Inactive",
  ].filter(Boolean);
  return parts.join("\t");
}

function formatMaintenanceScheduleRowCopyText(
  schedule: WorkshopMaintenanceScheduleListItem,
): string {
  const parts = [
    schedule.name,
    schedule.assetClassLabel,
    schedule.intervalLabel,
    `${schedule.vehicleCount} vehicles`,
    schedule.status === "active" ? "Active" : "Inactive",
  ].filter(Boolean);
  return parts.join("\t");
}

export default function AmcMaintenancePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

  const canCreate =
    permissions.has("workshop.create") ||
    permissions.has("workshop.manage");
  const canUpdate =
    permissions.has("workshop.update") ||
    permissions.has("workshop.manage");

  const [tierActivateTarget, setTierActivateTarget] =
    useState<WorkshopAmcTierListItem | null>(null);
  const [tierDeactivateTarget, setTierDeactivateTarget] =
    useState<WorkshopAmcTierListItem | null>(null);
  const [scheduleActivateTarget, setScheduleActivateTarget] =
    useState<WorkshopMaintenanceScheduleListItem | null>(null);
  const [scheduleDeactivateTarget, setScheduleDeactivateTarget] =
    useState<WorkshopMaintenanceScheduleListItem | null>(null);

  const tiersQuery = useQuery({
    queryKey: ["workshop", "amc-tiers", organizationId],
    queryFn: () =>
      fetchWorkshopAmcTiersApi(token!, organizationId!, 1, 50),
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const schedulesQuery = useQuery({
    queryKey: ["workshop", "amc-schedules", organizationId],
    queryFn: () =>
      fetchWorkshopMaintenanceSchedulesApi(token!, organizationId!, 1, 50),
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const tiers = tiersQuery.data?.items ?? [];
  const schedules = schedulesQuery.data?.items ?? [];

  const summary = useMemo(() => {
    const activeTiers = tiers.filter((tier) => tier.status === "active").length;
    const subscriptions = tiers.reduce(
      (sum, tier) => sum + tier.subscriberCount,
      0,
    );
    const thresholdReached = schedules.reduce(
      (sum, row) => sum + row.thresholdReachedCount,
      0,
    );
    return { activeTiers, subscriptions, thresholdReached };
  }, [tiers, schedules]);

  const tierStatusMutation = useMutation({
    mutationFn: async (input: {
      tier: WorkshopAmcTierListItem;
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateWorkshopAmcTierStatusApi(
        token,
        input.tier.id,
        organizationId,
        input.action,
        input.reason,
      );
    },
    onSuccess: (data, variables) => {
      void invalidateAmcTierCaches(queryClient);
      setTierActivateTarget(null);
      setTierDeactivateTarget(null);
      showSuccessToast(
        variables.action === "activate"
          ? `${data.name} was activated`
          : `${data.name} was deactivated`,
      );
    },
    onError: (error: Error) => {
      showErrorToast(
        error instanceof ApiClientError
          ? error.message
          : "Could not update tier status.",
      );
    },
  });

  const scheduleStatusMutation = useMutation({
    mutationFn: async (input: {
      schedule: WorkshopMaintenanceScheduleListItem;
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateWorkshopMaintenanceScheduleStatusApi(
        token,
        input.schedule.id,
        organizationId,
        input.action,
        input.reason,
      );
    },
    onSuccess: (data, variables) => {
      void invalidateAmcScheduleCaches(queryClient);
      setScheduleActivateTarget(null);
      setScheduleDeactivateTarget(null);
      showSuccessToast(
        variables.action === "activate"
          ? `${data.name} was activated`
          : `${data.name} was deactivated`,
      );
    },
    onError: (error: Error) => {
      showErrorToast(
        error instanceof ApiClientError
          ? error.message
          : "Could not update schedule status.",
      );
    },
  });

    return (
        <div className="min-h-full bg-gray-50 px-5 py-4 text-[14px] text-gray-800">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-[14px] font-semibold text-gray-900">
                        AMC &amp; Maintenance
                    </h1>
                    <p className="mt-1 text-xs text-gray-500">
                        Manage maintenance contracts, service schedules, and vehicle maintenance.
                    </p>
                </div>

                {canCreate ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => router.push(workshopAmcTierCreateHref)}
                    >
                        + Create tier
                    </Button>
                    <Button
                        type="button"
                        className="h-8 text-xs"
                        onClick={() => router.push(workshopAmcScheduleCreateHref)}
                    >
                        + Create schedule
                    </Button>
                </div>
                ) : null}
            </div>

            {/* Summary cards */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard
                    label="Active AMC tiers"
                    value={String(summary.activeTiers)}
                    description="Available maintenance plans"
                />
                <SummaryCard
                    label="Active subscriptions"
                    value={String(summary.subscriptions)}
                    description="Vehicles covered by AMC"
                />
                <SummaryCard
                    label="Threshold reached"
                    value={String(summary.thresholdReached)}
                    description="Requires maintenance attention"
                />
            </div>

            {/* AMC Tiers */}
            <section className="mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="px-4 py-3">
                    <h2 className="text-[14px] font-semibold">
                        AMC Tiers
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Contract plans and subscriber usage.
                    </p>
                </div>

                <div className="overflow-x-auto px-4">
                    <table className="w-full min-w-[620px] table-fixed text-left">
                        <thead>
                            <tr className="border-y border-gray-100 text-[10px] font-semibold uppercase text-gray-400">
                                <th className="w-[18%] py-3">Tier</th>
                                <th className="w-[38%] py-3">Plan details</th>
                                <th className="w-[20%] py-3">Subscribers</th>
                                <th className="w-[14%] py-3">Status</th>
                                <th className="w-[10%] py-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {tiersQuery.isLoading && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-6 text-center text-xs text-gray-500"
                                    >
                                        Loading tiers…
                                    </td>
                                </tr>
                            )}
                            {!tiersQuery.isLoading && tiers.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-6 text-center text-xs text-gray-500"
                                    >
                                        No AMC tiers yet. Use Create tier to add
                                        a plan.
                                    </td>
                                </tr>
                            )}
                            {tiers.map((tier) => (
                                <tr
                                    key={tier.id}
                                    className="border-b border-gray-100 last:border-0"
                                >
                                    <td className="py-3 text-xs font-medium">
                                        {tier.name}
                                    </td>

                                    <td className="py-3 pr-2 text-xs text-gray-500">
                                        <p>{tier.description ?? "—"}</p>
                                        <p className="mt-1">
                                            {tier.priceDisplayLabel ?? "—"}
                                        </p>
                                    </td>

                                    <td className="py-3 text-xs">
                                        {tier.subscriberCount} vehicles
                                    </td>

                                    <td className="py-3">
                                        <span
                                            className={
                                                tier.status === "active"
                                                    ? "rounded-full bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700"
                                                    : "rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600"
                                            }
                                        >
                                            {tier.status === "active"
                                                ? "Active"
                                                : "Inactive"}
                                        </span>
                                    </td>

                                    <td className="py-3 text-right">
                                        <DashboardTableActions
                                            status={tier.status}
                                            viewHref={workshopAmcTierDetailHref(
                                                tier.id,
                                            )}
                                            copyText={formatAmcTierRowCopyText(
                                                tier,
                                            )}
                                            onEdit={
                                                canUpdate &&
                                                tier.status === "active"
                                                    ? () =>
                                                          router.push(
                                                              workshopAmcTierEditHref(
                                                                  tier.id,
                                                              ),
                                                          )
                                                    : undefined
                                            }
                                            onToggleStatus={
                                                canUpdate
                                                    ? () =>
                                                          tier.status ===
                                                          "active"
                                                              ? setTierDeactivateTarget(
                                                                    tier,
                                                                )
                                                              : setTierActivateTarget(
                                                                    tier,
                                                                )
                                                    : undefined
                                            }
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Maintenance Schedules */}
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                        <h2 className="text-[14px] font-semibold">
                            Maintenance Schedules
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Service intervals and vehicle maintenance thresholds.
                        </p>
                    </div>

                    {canCreate ? (
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() =>
                            router.push(workshopAmcScheduleCreateHref)
                        }
                    >
                        + Add schedule
                    </Button>
                    ) : null}
                </div>

                <div className="overflow-x-auto px-4">
                    <table className="w-full min-w-[700px] table-fixed text-left">
                        <thead>
                            <tr className="border-y border-gray-100 text-[10px] font-semibold uppercase text-gray-400">
                                <th className="w-[27%] py-3">Schedule</th>
                                <th className="w-[23%] py-3">Asset class</th>
                                <th className="w-[17%] py-3">Interval</th>
                                <th className="w-[12%] py-3">Vehicles</th>
                                <th className="w-[13%] py-3">Threshold</th>
                                <th className="w-[8%] py-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {schedulesQuery.isLoading && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="py-6 text-center text-xs text-gray-500"
                                    >
                                        Loading schedules…
                                    </td>
                                </tr>
                            )}
                            {!schedulesQuery.isLoading &&
                                schedules.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-6 text-center text-xs text-gray-500"
                                        >
                                            No maintenance schedules yet.
                                        </td>
                                    </tr>
                                )}
                            {schedules.map((schedule) => (
                                <tr
                                    key={schedule.id}
                                    className="border-b border-gray-100 last:border-0"
                                >
                                    <td className="py-3 pr-2 text-xs font-medium">
                                        {schedule.name}
                                    </td>

                                    <td className="py-3 pr-2 text-xs text-gray-500">
                                        {schedule.assetClassLabel ?? "—"}
                                    </td>

                                    <td className="py-3 text-xs">
                                        {schedule.intervalLabel ?? "—"}
                                    </td>

                                    <td className="py-3 text-xs">
                                        {schedule.vehicleCount}
                                    </td>

                                    <td className="py-3">
                                        <span
                                            className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${schedule.thresholdReachedCount > 0
                                                ? "bg-orange-50 text-orange-700"
                                                : "bg-green-50 text-green-700"
                                                }`}
                                        >
                                            {schedule.thresholdReachedCount > 0
                                                ? `${schedule.thresholdReachedCount} reached`
                                                : "On track"}
                                        </span>
                                    </td>

                                    <td className="py-3 text-right">
                                        <DashboardTableActions
                                            status={schedule.status}
                                            viewHref={workshopAmcScheduleDetailHref(
                                                schedule.id,
                                            )}
                                            copyText={formatMaintenanceScheduleRowCopyText(
                                                schedule,
                                            )}
                                            onEdit={
                                                canUpdate &&
                                                schedule.status === "active"
                                                    ? () =>
                                                          router.push(
                                                              workshopAmcScheduleEditHref(
                                                                  schedule.id,
                                                              ),
                                                          )
                                                    : undefined
                                            }
                                            onToggleStatus={
                                                canUpdate
                                                    ? () =>
                                                          schedule.status ===
                                                          "active"
                                                              ? setScheduleDeactivateTarget(
                                                                    schedule,
                                                                )
                                                              : setScheduleActivateTarget(
                                                                    schedule,
                                                                )
                                                    : undefined
                                            }
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-start gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <p>
                        Maintenance thresholds are informational. When a schedule
                        threshold is reached, a work order should be generated
                        through the existing Workshop workflow.
                    </p>
                </div>
            </section>

            <ConfirmDialog
                open={tierActivateTarget !== null}
                title="Activate AMC tier?"
                message={
                    tierActivateTarget
                        ? `${tierActivateTarget.name} will be available for new subscriptions.`
                        : ""
                }
                confirmLabel="Activate"
                isConfirmPending={tierStatusMutation.isPending}
                onConfirm={() => {
                    if (tierActivateTarget) {
                        tierStatusMutation.mutate({
                            tier: tierActivateTarget,
                            action: "activate",
                        });
                    }
                }}
                onClose={() => setTierActivateTarget(null)}
            />
            <ReasonRequiredDialog
                open={tierDeactivateTarget !== null}
                title="Deactivate AMC tier?"
                description={
                    tierDeactivateTarget
                        ? `${tierDeactivateTarget.name} will no longer accept new subscriptions.`
                        : ""
                }
                confirmLabel="Deactivate"
                isPending={tierStatusMutation.isPending}
                onConfirm={(reason) => {
                    if (tierDeactivateTarget) {
                        tierStatusMutation.mutate({
                            tier: tierDeactivateTarget,
                            action: "deactivate",
                            reason,
                        });
                    }
                }}
                onClose={() => setTierDeactivateTarget(null)}
            />
            <ConfirmDialog
                open={scheduleActivateTarget !== null}
                title="Activate maintenance schedule?"
                message={
                    scheduleActivateTarget
                        ? `${scheduleActivateTarget.name} will be active again.`
                        : ""
                }
                confirmLabel="Activate"
                isConfirmPending={scheduleStatusMutation.isPending}
                onConfirm={() => {
                    if (scheduleActivateTarget) {
                        scheduleStatusMutation.mutate({
                            schedule: scheduleActivateTarget,
                            action: "activate",
                        });
                    }
                }}
                onClose={() => setScheduleActivateTarget(null)}
            />
            <ReasonRequiredDialog
                open={scheduleDeactivateTarget !== null}
                title="Deactivate maintenance schedule?"
                description={
                    scheduleDeactivateTarget
                        ? `${scheduleDeactivateTarget.name} will be marked inactive.`
                        : ""
                }
                confirmLabel="Deactivate"
                isPending={scheduleStatusMutation.isPending}
                onConfirm={(reason) => {
                    if (scheduleDeactivateTarget) {
                        scheduleStatusMutation.mutate({
                            schedule: scheduleDeactivateTarget,
                            action: "deactivate",
                            reason,
                        });
                    }
                }}
                onClose={() => setScheduleDeactivateTarget(null)}
            />
        </div>
    );
}

function SummaryCard({
    label,
    value,
    description,
}: {
    label: string;
    value: string;
    description: string;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-2 text-[14px] font-semibold text-gray-900">
                {value}
            </p>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
    );
}
