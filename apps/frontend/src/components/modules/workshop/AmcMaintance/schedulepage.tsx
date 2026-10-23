"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateAmcScheduleCaches } from "@/lib/query/invalidate-domain-caches";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { WORKSHOP_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { ApiClientError } from "@/lib/api/client";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import {
  fetchWorkshopMaintenanceScheduleApi,
  fetchWorkshopMaintenanceScheduleVehiclesApi,
  updateWorkshopMaintenanceScheduleApi,
  updateWorkshopMaintenanceScheduleStatusApi,
  type WorkshopMaintenanceScheduleVehicleRow,
} from "@/lib/api/workshop/amc";
import { assetRegisterFleetDetailHref } from "@/lib/navigation/asset-register-static-routes";
import { useWorkshopEntityId } from "@/lib/navigation/use-workshop-entity-id";
import {
  isWorkshopStaticEditPath,
  workshopAmcMaintenanceListHref,
  workshopAmcScheduleDetailHref,
  workshopAmcScheduleEditHref,
  workshopWorkOrderDetailHref,
} from "@/lib/navigation/workshop-static-routes";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

function parseIntervalValue(
  intervalLabel: string | null,
  intervalType: string | null,
): string {
  if (!intervalLabel?.trim()) return "";
  const trimmed = intervalLabel.trim();
  if (intervalType === "Odometer" && trimmed.endsWith(" km")) {
    return trimmed.slice(0, -3).trim();
  }
  if (intervalType === "Time" && trimmed.endsWith(" days")) {
    return trimmed.slice(0, -5).trim();
  }
  return trimmed.replace(/\s*(km|days)$/i, "").trim();
}

export default function AmcScheduleDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isEditRoute = isWorkshopStaticEditPath(pathname);
  const scheduleId = useWorkshopEntityId("scheduleId");
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

  const canUpdate =
    permissions.has("workshop.update") ||
    permissions.has("workshop.manage");

  const scheduleQuery = useQuery({
    queryKey: ["workshop", "amc-schedule", organizationId, scheduleId],
    queryFn: () =>
      fetchWorkshopMaintenanceScheduleApi(token!, organizationId!, scheduleId),
    enabled: !!token && !!organizationId && !!scheduleId && !isAuthLoading,
  });

  const scheduleVehiclesQuery = useQuery({
    queryKey: [
      "workshop",
      "amc-schedule-vehicles",
      organizationId,
      scheduleId,
    ],
    queryFn: () =>
      fetchWorkshopMaintenanceScheduleVehiclesApi(
        token!,
        organizationId!,
        scheduleId,
        1,
        50,
      ),
    enabled:
      !!token &&
      !!organizationId &&
      !!scheduleId &&
      !isAuthLoading &&
      !isEditRoute,
  });

  const [activateOpen, setActivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const [name, setName] = useState("");
  const [assetClassLabel, setAssetClassLabel] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("Preventive Maintenance");
  const [intervalType, setIntervalType] = useState("Odometer");
  const [intervalValue, setIntervalValue] = useState("");
  const [vehicleApplicability, setVehicleApplicability] = useState("Leased");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (isAuthLoading) return;
    if (!scheduleId) {
      router.replace(workshopAmcMaintenanceListHref);
    }
  }, [isAuthLoading, scheduleId, router]);

  useEffect(() => {
    const row = scheduleQuery.data;
    if (!row) return;
    if (isEditRoute && row.status === "inactive") {
      navigateToEntityShell(router, workshopAmcScheduleDetailHref(scheduleId), scheduleId, 'replace');
      return;
    }
    setName(row.name);
    setAssetClassLabel(row.assetClassLabel ?? "");
    setMaintenanceType(row.maintenanceType ?? "Preventive Maintenance");
    setIntervalType(row.intervalType ?? "Odometer");
    setIntervalValue(parseIntervalValue(row.intervalLabel, row.intervalType));
    setVehicleApplicability(row.vehicleApplicability ?? "Leased");
    setDescription(row.description ?? "");
  }, [scheduleQuery.data, isEditRoute, scheduleId, router]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      const intervalSuffix =
        intervalType === "Odometer" ? " km" : " days";
      return updateWorkshopMaintenanceScheduleApi(token, scheduleId, {
        organizationId,
        name: name.trim(),
        assetClassLabel: assetClassLabel.trim() || null,
        intervalLabel: intervalValue.trim()
          ? `${intervalValue.trim()}${intervalSuffix}`
          : null,
        maintenanceType: maintenanceType.trim() || null,
        intervalType: intervalType.trim() || null,
        vehicleApplicability: vehicleApplicability.trim() || null,
        description: description.trim() || null,
      });
    },
    onSuccess: (data) => {
      void invalidateAmcScheduleCaches(queryClient);
      showSuccessToast(`${data.name} was updated`);
      navigateToEntityShell(router, workshopAmcScheduleDetailHref(scheduleId), scheduleId, 'push');
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not save schedule. Try again.";
      showErrorToast(message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateWorkshopMaintenanceScheduleStatusApi(
        token,
        scheduleId,
        organizationId,
        input.action,
        input.reason,
      );
    },
    onSuccess: (data, variables) => {
      void invalidateAmcScheduleCaches(queryClient);
      setActivateOpen(false);
      setDeactivateOpen(false);
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

  const schedule = scheduleQuery.data;

  if (!scheduleId && !isAuthLoading) {
    return null;
  }

  if (scheduleQuery.isLoading || isAuthLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading maintenance schedule…
      </div>
    );
  }

  if (scheduleQuery.isError || !schedule) {
    return (
      <div className="min-h-full bg-gray-50 px-5 py-4 text-sm text-gray-700">
        <p>Could not load this maintenance schedule.</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() => router.push(workshopAmcMaintenanceListHref)}
        >
          Back to AMC &amp; Maintenance
        </Button>
      </div>
    );
  }

  const editInputClass =
    "mt-1 h-9 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

  if (isEditRoute) {
    const intervalValid =
      !!intervalValue.trim() &&
      Number.isFinite(Number(intervalValue)) &&
      Number(intervalValue) > 0;
    const canSubmitEdit =
      canUpdate && !!name.trim() && intervalValid && !saveMutation.isPending;

    return (
      <OrganizationFormLayout
        title="Edit maintenance schedule"
        backLink={{
          label: "Back to schedule",
          href: workshopAmcScheduleDetailHref(scheduleId),
        }}
        contentVariant="plain"
      >
        <div className="w-full space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <label className="block text-xs font-medium text-gray-700">
            Schedule name
            <RestrictedInput
              restrictedKind="name"
              maxLength={WORKSHOP_INPUT_LIMITS.maintenanceScheduleName}
              value={name}
              onChange={(value) => setName(value)}
              className={editInputClass}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Asset class label
            <RestrictedInput
              restrictedKind="text"
              maxLength={WORKSHOP_INPUT_LIMITS.maintenanceScheduleName}
              value={assetClassLabel}
              onChange={(value) => setAssetClassLabel(value)}
              className={editInputClass}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Maintenance type
            <select
              value={maintenanceType}
              onChange={(event) => setMaintenanceType(event.target.value)}
              className={editInputClass}
            >
              <option value="Preventive Maintenance">Preventive Maintenance</option>
              <option value="Corrective Maintenance">Corrective Maintenance</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Interval type
            <select
              value={intervalType}
              onChange={(event) => setIntervalType(event.target.value)}
              className={editInputClass}
            >
              <option value="Odometer">Odometer</option>
              <option value="Time">Time</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Service interval
            <RestrictedInput
              restrictedKind="digits"
              maxLength={8}
              value={intervalValue}
              onChange={(value) => setIntervalValue(value)}
              className={editInputClass}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Vehicle applicability
            <select
              value={vehicleApplicability}
              onChange={(event) => setVehicleApplicability(event.target.value)}
              className={editInputClass}
            >
              <option value="Leased">Leased</option>
              <option value="Owned">Owned</option>
              <option value="All">All</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Description (optional)
            <RestrictedInput
              restrictedKind="text"
              maxLength={WORKSHOP_INPUT_LIMITS.amcTierDescription}
              value={description}
              onChange={(value) => setDescription(value)}
              className={editInputClass}
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigateToEntityShell(router, workshopAmcScheduleDetailHref(scheduleId), scheduleId, 'push')
            }
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmitEdit}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </OrganizationFormLayout>
    );
  }

  return (
    <main className="min-h-full bg-gray-50 px-5 py-4 text-[14px] text-gray-800">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <button
          type="button"
          onClick={() => router.push(workshopAmcMaintenanceListHref)}
          className="hover:text-[#FE5720]"
        >
          AMC &amp; Maintenance
        </button>
        <span>/</span>
        <span className="text-gray-800">{schedule.name}</span>
      </nav>

      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[14px] font-semibold text-gray-900">
              {schedule.name}
            </h1>
            <span
              className={
                schedule.status === "active"
                  ? "rounded-full bg-green-50 px-2 py-1 text-[14px] font-medium text-green-700"
                  : "rounded-full bg-gray-100 px-2 py-1 text-[14px] font-medium text-gray-600"
              }
            >
              {schedule.status === "active" ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {[schedule.assetClassLabel, schedule.intervalLabel]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canUpdate && schedule.status === "active" ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() =>
                navigateToEntityShell(router, workshopAmcScheduleEditHref(scheduleId), scheduleId, 'push')
              }
            >
              Edit schedule
            </Button>
          ) : null}
          {canUpdate && schedule.status === "active" ? (
            <Button
              type="button"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() => setDeactivateOpen(true)}
            >
              Deactivate
            </Button>
          ) : null}
          {canUpdate && schedule.status === "inactive" ? (
            <Button
              type="button"
              className="h-8 text-xs"
              onClick={() => setActivateOpen(true)}
            >
              Activate
            </Button>
          ) : null}
        </div>
      </header>

      <section className="w-full rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p>
          <span className="font-medium">Maintenance type:</span>{" "}
          {schedule.maintenanceType ?? "—"}
        </p>
        <p className="mt-2">
          <span className="font-medium">Applicability:</span>{" "}
          {schedule.vehicleApplicability ?? "—"}
        </p>
        {schedule.description ? (
          <p className="mt-2">
            <span className="font-medium">Description:</span>{" "}
            {schedule.description}
          </p>
        ) : null}
        <p className="mt-2">
          <span className="font-medium">Vehicles on schedule:</span>{" "}
          {schedule.vehicleCount}
        </p>
        <p className="mt-2">
          <span className="font-medium">Threshold reached:</span>{" "}
          {schedule.thresholdReachedCount}
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-[14px] font-semibold text-gray-900">
          Vehicles on this schedule
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Matched automatically by asset class and odometer interval.
        </p>
        {scheduleVehiclesQuery.isLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading vehicles…</p>
        ) : scheduleVehiclesQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">
            Could not load vehicles for this schedule.
          </p>
        ) : (scheduleVehiclesQuery.data?.items.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            No active fleet vehicles match this schedule&apos;s asset class.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-4 font-medium">Fleet code</th>
                  <th className="py-2 pr-4 font-medium">Asset class</th>
                  <th className="py-2 pr-4 font-medium">Odometer</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduleVehiclesQuery.data?.items.map(
                  (row: WorkshopMaintenanceScheduleVehicleRow) => {
                    const viewHref =
                      row.thresholdStatus === "threshold_reached" &&
                      row.pmWorkOrderId
                        ? workshopWorkOrderDetailHref(row.pmWorkOrderId)
                        : assetRegisterFleetDetailHref(row.vehicleId);
                    return (
                      <tr
                        key={row.vehicleId}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="py-2 pr-4 font-medium text-gray-900">
                          {row.fleetCode}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {row.assetClassName}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {row.odometer.toLocaleString("en-IN")} km
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={
                              row.thresholdStatus === "threshold_reached"
                                ? "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
                                : "rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                            }
                          >
                            {row.thresholdStatus === "threshold_reached"
                              ? "Threshold reached"
                              : "On schedule"}
                          </span>
                        </td>
                        <td className="py-2">
                          <DashboardTableActions
                            viewHref={viewHref}
                            navigationEntityId={
                              row.thresholdStatus === "threshold_reached" &&
                              row.pmWorkOrderId
                                ? row.pmWorkOrderId
                                : row.vehicleId
                            }
                            status="active"
                            copyText={[
                              row.fleetCode,
                              row.assetClassName,
                              `${row.odometer.toLocaleString("en-IN")} km`,
                              row.thresholdStatus === "threshold_reached"
                                ? "Threshold reached"
                                : "On schedule",
                            ].join("\t")}
                          />
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={activateOpen}
        title="Activate maintenance schedule?"
        message={`${schedule.name} will be active again.`}
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate({ action: "activate" })}
        onClose={() => setActivateOpen(false)}
      />
      <ReasonRequiredDialog
        open={deactivateOpen}
        title="Deactivate maintenance schedule?"
        description={`${schedule.name} will be marked inactive.`}
        confirmLabel="Deactivate"
        isPending={statusMutation.isPending}
        onConfirm={(reason) =>
          statusMutation.mutate({ action: "deactivate", reason })
        }
        onClose={() => setDeactivateOpen(false)}
      />
    </main>
  );
}
