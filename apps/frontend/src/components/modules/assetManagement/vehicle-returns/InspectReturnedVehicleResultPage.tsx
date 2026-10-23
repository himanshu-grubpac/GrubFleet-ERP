"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import OrganizationDetailCard from "@/components/common/OrganizationDetailCard";
import { DashboardPageLoadingShell } from "@/components/dashboard/dashboard-async-states";
import {
    DashboardMetricTile,
    DashboardSectionHeader,
    DashboardSemanticBanner,
    DashboardStatusPill,
    DashboardTimelineStep,
} from "@/components/dashboard/dashboard-semantic-cell";
import { ErrorState } from "@/components/states/async-states";
import GrubpacButton from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import {
    fetchFleetReturnDetailApi,
    type FleetReturnInspectionResultActionKey,
    type FleetReturnInspectionResultPresentation,
} from "@/lib/api/fleet-leasing/returns";
import { formatInrFromMinor } from "@/lib/format/money-format";
import { financeInvoiceDetailHref } from "@/lib/navigation/finance-static-routes";
import {
    getDashboardBannerLevelFromStatusBanner,
    getDashboardJobCardStatusPillClass,
} from "@/lib/format/dashboard-semantic-surfaces";
import {
    type DashboardSemanticLevel,
} from "@/lib/format/dashboard-table-semantic-presentation";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useSecureEntityId } from "@/lib/navigation/use-secure-entity-id";
import {
    assetRegisterAssetAssignDetailHref,
    assetRegisterFleetLeaseHistoryHref,
} from "@/lib/navigation/asset-register-static-routes";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { workshopWorkOrderDetailHref } from "@/lib/navigation/workshop-static-routes";
import { DASHBOARD_DISABLED_REASON_CLASS } from "@/lib/format/dashboard-semantic-surfaces";

function closingReasonLabel(reason: string | null | undefined): string {
    if (reason === "completed") return "Completed";
    if (reason === "terminated_early") return "Terminated early";
    if (reason === "cancelled") return "Cancelled";
    return "—";
}

function vehicleStatusLabel(status: string): string {
    if (status === "workshop") return "In workshop";
    if (status === "available") return "Available";
    if (status === "returned") return "Returned";
    return status;
}

function vehicleStatusLevel(status: string): DashboardSemanticLevel {
    if (status === "workshop") return "amber";
    if (status === "available") return "success";
    return "neutral";
}

function recoveryStatusLabel(status: string): string {
    if (status === "waiting_for_finance") return "Waiting for Finance";
    if (status === "unpaid") return "Unpaid";
    if (status === "partially_paid") return "Partially paid";
    if (status === "paid") return "Paid";
    if (status === "cancelled") return "Cancelled";
    return "—";
}

function recoveryStatusLevel(
    status: string,
): "brand" | "amber" | "success" | "neutral" {
    if (status === "waiting_for_finance" || status === "unpaid") return "brand";
    if (status === "partially_paid") return "amber";
    if (status === "paid") return "success";
    return "neutral";
}

function ResultActions({
    result,
    onAction,
}: {
    result: FleetReturnInspectionResultPresentation;
    onAction: (key: FleetReturnInspectionResultActionKey) => void;
}) {
    const secondaryActions = result.availableActions.filter(
        (a) => a.variant !== "primary",
    );
    const primaryActions = result.availableActions.filter(
        (a) => a.variant === "primary",
    );
    return (
        <div className="space-y-3 border-t border-gray-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {secondaryActions.map((action) => (
                        <GrubpacButton
                            key={action.actionKey}
                            type="button"
                            variant={
                                action.variant === "ghost"
                                    ? "outline"
                                    : "secondary"
                            }
                            disabled={!action.enabled}
                            title={action.reasonDisabled}
                            onClick={() => onAction(action.actionKey)}
                        >
                            {action.label}
                        </GrubpacButton>
                    ))}
                </div>
                {primaryActions.map((action) => (
                    <GrubpacButton
                        key={action.actionKey}
                        type="button"
                        disabled={!action.enabled}
                        title={action.reasonDisabled}
                        onClick={() => onAction(action.actionKey)}
                    >
                        {action.label}
                    </GrubpacButton>
                ))}
            </div>
            {primaryActions.some(
                (a) => !a.enabled && a.reasonDisabled?.trim(),
            ) ? (
                <p className={DASHBOARD_DISABLED_REASON_CLASS}>
                    {primaryActions.find((a) => !a.enabled)?.reasonDisabled}
                </p>
            ) : null}
        </div>
    );
}

export default function InspectReturnedVehicleResultPage() {
    const router = useRouter();
    const inspectionId = useSecureEntityId();
    const { token, organizationId, permissions } = useAuth();

    const canView =
        permissions.has("fleet_leasing.view") ||
        permissions.has("fleet_leasing.manage") ||
        permissions.has("asset_register.view") ||
        permissions.has("asset_register.manage");

    const canAssignVehicle =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const detailQuery = useQuery({
        queryKey: ["fleet-return", inspectionId, organizationId],
        queryFn: () =>
            fetchFleetReturnDetailApi({
                token: token!,
                organizationId: organizationId!,
                inspectionId,
            }),
        enabled:
            Boolean(token) &&
            Boolean(organizationId) &&
            Boolean(inspectionId) &&
            canView,
        ...dashboardListQueryOptions,
        staleTime: 10_000,
        refetchOnWindowFocus: true,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (
                data?.inspectionResult?.outcome === "sent_to_workshop" &&
                !data.workshopRepairClosedAt
            ) {
                return 15_000;
            }
            return false;
        },
    });

    const detail = detailQuery.data;
    const result = detail?.inspectionResult
        ? {
              ...detail.inspectionResult,
              availableActions: detail.inspectionResult.availableActions
                  .filter(
                      (action) => action.actionKey !== "close_workshop_repair",
                  )
                  .map((action) => {
                      if (
                          action.actionKey === "assign_contract" &&
                          !canAssignVehicle
                      ) {
                          return {
                              ...action,
                              enabled: false,
                              reasonDisabled:
                                  "You do not have permission to assign vehicles.",
                          };
                      }
                      return action;
                  }),
          }
        : undefined;

    const handleAction = (key: FleetReturnInspectionResultActionKey) => {
        if (!result) return;
        const action = result.availableActions.find((a) => a.actionKey === key);
        if (!action?.enabled) return;

        if (key === "back_to_list") {
            router.push("/asset-register/vehicle-returns/");
            return;
        }
        if (key === "next_to_inspect") {
            router.push("/asset-register/vehicle-returns/?pipelineTab=to_inspect");
            return;
        }
        if (key === "open_workshop" && action.workshopJobId) {
            navigateToEntityShell(
                router,
                workshopWorkOrderDetailHref(action.workshopJobId),
                action.workshopJobId,
                "push",
            );
            return;
        }
        if (key === "assign_contract") {
            const vehicleId =
                action.assetRegisterVehicleId ??
                detail?.assetRegisterVehicleId ??
                null;
            if (!vehicleId || !canAssignVehicle) return;
            navigateToEntityShell(
                router,
                assetRegisterAssetAssignDetailHref(vehicleId),
                vehicleId,
                "push",
            );
            return;
        }
        if (key === "vehicle_history") {
            const vehicleId =
                action.assetRegisterVehicleId ??
                detail?.assetRegisterVehicleId ??
                null;
            if (!vehicleId) return;
            navigateToEntityShell(
                router,
                assetRegisterFleetLeaseHistoryHref(vehicleId),
                vehicleId,
                "push",
            );
        }
    };

    if (detailQuery.isLoading || !token || !organizationId) {
        return <DashboardPageLoadingShell />;
    }

    if (detailQuery.isError || !detail) {
        return (
            <OrganizationFormLayout title="Inspection result" contentVariant="plain">
                <ErrorState
                    message="Could not load inspection result."
                    onRetry={() => detailQuery.refetch()}
                />
            </OrganizationFormLayout>
        );
    }

    if (detail.inspectionStatus !== "completed" || !result) {
        const guard = detail.flowGuards?.inspectResultView;
        return (
            <OrganizationFormLayout
                title={detail.fleetCode || detail.registrationNo}
                contentVariant="plain"
            >
                {guard ? (
                    <DashboardSemanticBanner
                        level={getDashboardBannerLevelFromStatusBanner(
                            guard.level,
                        )}
                        className="mb-4"
                    >
                        {guard.message}
                    </DashboardSemanticBanner>
                ) : null}
                <OrganizationDetailCard className="p-6">
                    <GrubpacButton
                        type="button"
                        variant="secondary"
                        className="mt-4"
                        onClick={() =>
                            router.push("/asset-register/vehicle-returns/")
                        }
                    >
                        Back to Vehicle Returns
                    </GrubpacButton>
                </OrganizationDetailCard>
            </OrganizationFormLayout>
        );
    }

    const headerTitle = `${detail.fleetCode} · ${detail.registrationNo}`;
    const subtitle = `Returned by ${detail.clientName} · ${detail.contractNumber} · ${closingReasonLabel(detail.expectedReturn.closingReason)}`;

    return (
        <OrganizationFormLayout
            title={headerTitle}
            description={subtitle}
            contentVariant="plain"
            headerAction={
                <DashboardStatusPill
                    label={vehicleStatusLabel(detail.vehicleStatus)}
                    level={vehicleStatusLevel(detail.vehicleStatus)}
                />
            }
        >
            {result.statusBanner ? (
                <DashboardSemanticBanner
                    level={getDashboardBannerLevelFromStatusBanner(
                        result.statusBanner.level,
                    )}
                    className="mb-4"
                >
                    {result.statusBanner.message}
                </DashboardSemanticBanner>
            ) : null}

            {result.outcome === "ready_to_lease" ? (
                <div className="space-y-6">
                    {result.contractClosingProgress ? (
                        <OrganizationDetailCard className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">
                                Closing
                            </span>
                            <span className="text-sm text-gray-600">
                                {result.contractClosingProgress.returnedCount} of{" "}
                                {result.contractClosingProgress.totalCount} back
                            </span>
                        </OrganizationDetailCard>
                    ) : null}

                    <OrganizationDetailCard className="p-6">
                        <DashboardSectionHeader>
                            {detail.fleetCode} · {detail.registrationNo}
                        </DashboardSectionHeader>
                        <p className="mt-1 text-sm text-gray-600">
                            {detail.assetClass}
                        </p>
                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                            <DashboardMetricTile
                                label="Off-lease"
                                value={
                                    result.metrics.offLeaseDays != null
                                        ? `${result.metrics.offLeaseDays} days`
                                        : "—"
                                }
                            />
                            <DashboardMetricTile
                                label="Repair cost"
                                value={formatInrFromMinor(
                                    result.metrics.repairCostMinor,
                                )}
                            />
                            <DashboardMetricTile
                                label={`To recover from ${detail.clientName}`}
                                value={formatInrFromMinor(
                                    result.metrics.recoveryTotalMinor,
                                )}
                            />
                        </div>
                    </OrganizationDetailCard>

                    {result.recoveryNote.lines.length > 0 ? (
                        <OrganizationDetailCard className="p-4">
                            <h3 className="text-sm font-semibold text-gray-900">
                                Recovery note {result.recoveryNote.displayNumber}
                            </h3>
                            <ul className="mt-3 space-y-2 text-sm">
                                {result.recoveryNote.lines.map((line) => (
                                    <li
                                        key={line.label}
                                        className="flex justify-between gap-4"
                                    >
                                        <span className="text-gray-600">
                                            {line.label}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {formatInrFromMinor(line.amountMinor)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </OrganizationDetailCard>
                    ) : null}

                    <OrganizationDetailCard className="p-4">
                        <DashboardSectionHeader>Return timeline</DashboardSectionHeader>
                        <ol className="mt-4 list-none pl-0">
                            {result.timeline.map((step, index) => (
                                <DashboardTimelineStep
                                    key={step.key}
                                    label={step.label}
                                    detail={step.detail}
                                    state={step.state}
                                    showConnector={
                                        index < result.timeline.length - 1
                                    }
                                />
                            ))}
                        </ol>
                    </OrganizationDetailCard>

                    <ResultActions result={result} onAction={handleAction} />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {result.jobCard ? (
                            <OrganizationDetailCard className="p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">
                                            Job card {result.jobCard.displayNumber}
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-600">
                                            In-house
                                            {result.jobCard.depotLabel
                                                ? ` · ${result.jobCard.depotLabel}`
                                                : ""}
                                            {result.jobCard.targetReadyDate
                                                ? ` · target ready ${result.jobCard.targetReadyDate}`
                                                : ""}{" "}
                                            · Normal priority
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getDashboardJobCardStatusPillClass(result.jobCard.status)}`}
                                    >
                                        {result.jobCard.status === "open"
                                            ? "Open"
                                            : "Closed"}
                                    </span>
                                </div>
                                <ul className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
                                    {result.jobCard.tasks.map((task) => (
                                        <li
                                            key={task.label}
                                            className="flex items-center justify-between py-2 text-sm"
                                        >
                                            <span className="text-gray-800">
                                                {task.label}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {task.status === "todo"
                                                    ? "To do"
                                                    : "Done"}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </OrganizationDetailCard>
                        ) : null}

                        <OrganizationDetailCard className="p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Recovery note{" "}
                                    {result.recoveryNote.displayNumber}
                                </h3>
                                {result.recoveryNote.status !== "none" ? (
                                    <DashboardStatusPill
                                        label={recoveryStatusLabel(
                                            result.recoveryNote.status,
                                        )}
                                        level={recoveryStatusLevel(
                                            result.recoveryNote.status,
                                        )}
                                    />
                                ) : null}
                            </div>
                            {result.recoveryNote.financeInvoiceId ? (
                                <p className="mt-2">
                                    <button
                                        type="button"
                                        className="text-sm font-medium text-[#FE5720] hover:underline"
                                        onClick={() => {
                                            const invoiceId =
                                                result.recoveryNote
                                                    .financeInvoiceId!;
                                            navigateToEntityShell(
                                                router,
                                                financeInvoiceDetailHref(
                                                    invoiceId,
                                                ),
                                                invoiceId,
                                                "push",
                                            );
                                        }}
                                    >
                                        View finance invoice
                                    </button>
                                </p>
                            ) : null}
                            {result.recoveryNote.lines.length > 0 ? (
                                <>
                                    <ul className="mt-4 space-y-2 text-sm">
                                        {result.recoveryNote.lines.map(
                                            (line) => (
                                                <li
                                                    key={line.label}
                                                    className="flex justify-between gap-4"
                                                >
                                                    <span className="text-gray-600">
                                                        {line.label}
                                                    </span>
                                                    <span className="font-medium text-gray-900">
                                                        {formatInrFromMinor(
                                                            line.amountMinor,
                                                        )}
                                                    </span>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                    <p className="mt-4 flex justify-between border-t border-gray-100 pt-3 text-sm font-semibold text-gray-900">
                                        <span>
                                            Billed to{" "}
                                            {result.recoveryNote.billedToClientName}
                                        </span>
                                        <span>
                                            {formatInrFromMinor(
                                                result.recoveryNote.totalMinor,
                                            )}
                                        </span>
                                    </p>
                                </>
                            ) : (
                                <p className="mt-3 text-sm text-gray-600">
                                    No client recovery charges from this
                                    inspection.
                                </p>
                            )}
                            <p className="mt-3 text-xs text-gray-500">
                                {result.recoveryNote.contractFootnote}
                            </p>
                        </OrganizationDetailCard>

                        <ResultActions
                            result={result}
                            onAction={handleAction}
                        />
                    </div>

                    <OrganizationDetailCard className="h-fit p-4 lg:col-span-1">
                        <DashboardSectionHeader>Return timeline</DashboardSectionHeader>
                        <ol className="mt-4 list-none pl-0">
                            {result.timeline.map((step, index) => (
                                <DashboardTimelineStep
                                    key={step.key}
                                    label={step.label}
                                    detail={step.detail}
                                    state={step.state}
                                    showConnector={
                                        index < result.timeline.length - 1
                                    }
                                />
                            ))}
                        </ol>
                    </OrganizationDetailCard>
                </div>
            )}
        </OrganizationFormLayout>
    );
}
