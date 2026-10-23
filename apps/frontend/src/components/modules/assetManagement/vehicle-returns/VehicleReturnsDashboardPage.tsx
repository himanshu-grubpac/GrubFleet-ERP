"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import {
    DashboardPipelineTabCount,
    DashboardSemanticText,
    DashboardStageLabel,
} from "@/components/dashboard/dashboard-semantic-cell";
import GrubpacButton from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
    fetchFleetReturnsListApi,
    resolveFleetReturnHoldApi,
    parseFleetReturnDepotFilterValue,
    type FleetReturnClosingReason,
    type FleetReturnListItem,
    type FleetReturnListPipelineTab,
} from "@/lib/api/fleet-leasing/returns";
import { fetchAllActiveOrganisationLocationsApi } from "@/lib/api/organisation/locations";
import {
    assetRegisterVehicleReturnInspectFinalizeHref,
    assetRegisterVehicleReturnInspectHref,
    assetRegisterVehicleReturnInspectResultHref,
    assetRegisterVehicleReturnReceiveHref,
    assetRegisterVehicleReturnReInspectHref,
} from "@/lib/navigation/asset-register-static-routes";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import {
    grubpacVariantForNextStep,
    vehicleReturnNextStepButtonClass,
    vehicleReturnNextStepActions,
    type VehicleReturnNextStepKind,
} from "./vehicle-return-list-next-step";
import { workshopWorkOrderDetailHref } from "@/lib/navigation/workshop-static-routes";
import {
    showErrorToast,
    showSuccessToast,
} from "@/lib/toast/show-toast";
import {
    vehicleReturnDueReceivedLabel,
    vehicleReturnDueReceivedUrgency,
    vehicleReturnPipelineTabCountLevel,
    vehicleReturnStageDotLevel,
    vehicleReturnStageDetailLine,
    vehicleReturnStageLabel,
    vehicleReturnStageLabelTextClass,
} from "@/lib/format/vehicle-return-list-presentation";

const PAGE_SIZE = 50;

/** Bulk receive hidden until batch gate-in API + screens ship (see REQUIREMENTS_GAPS). */
const SHOW_BULK_RECEIVE_HEADER_ACTION = false;
const BULK_RECEIVE_DISABLED_TITLE =
    "Bulk receive ships with batch gate-in API";

const TAB_DEFS: Array<{ id: FleetReturnListPipelineTab; label: string }> = [
    { id: "all_open", label: "All open" },
    { id: "expected", label: "Expected" },
    { id: "overdue", label: "Overdue" },
    { id: "to_inspect", label: "To inspect" },
    { id: "in_inspection", label: "In inspection" },
    { id: "workshop", label: "In workshop" },
    { id: "closed", label: "Closed" },
];

const REASON_FILTER_OPTIONS = [
    { label: "Completed", value: "completed" },
    { label: "Terminated", value: "terminated_early" },
    { label: "Cancelled", value: "cancelled" },
];

function closingReasonLabel(reason: string | null | undefined): string {
    if (reason === "completed") return "Completed";
    if (reason === "terminated_early") return "Terminated";
    if (reason === "cancelled") return "Cancelled";
    return "—";
}

function runNextStepAction(
    router: ReturnType<typeof useRouter>,
    row: FleetReturnListItem,
    kind: VehicleReturnNextStepKind,
    workshopJobId?: string | null,
    onResolveHold?: (row: FleetReturnListItem) => void,
) {
    if (kind === "resolve_hold") {
        onResolveHold?.(row);
        return;
    }
    if (kind === "receive") {
        navigateToEntityShell(
            router,
            assetRegisterVehicleReturnReceiveHref(row.id),
            row.id,
            "push",
        );
        return;
    }
    if (kind === "start_inspection" || kind === "continue_inspection") {
        navigateToEntityShell(
            router,
            assetRegisterVehicleReturnInspectHref(row.id),
            row.id,
            "push",
        );
        return;
    }
    if (kind === "finalize_inspection") {
        navigateToEntityShell(
            router,
            assetRegisterVehicleReturnInspectFinalizeHref(row.id),
            row.id,
            "push",
        );
        return;
    }
    if (kind === "reinspect") {
        navigateToEntityShell(
            router,
            assetRegisterVehicleReturnReInspectHref(row.id),
            row.id,
            "push",
        );
        return;
    }
    if (kind === "view_inspection_result") {
        navigateToEntityShell(
            router,
            assetRegisterVehicleReturnInspectResultHref(row.id),
            row.id,
            "push",
        );
        return;
    }
    if (kind === "view_job") {
        const jobId = workshopJobId?.trim() || null;
        if (!jobId) return;
        navigateToEntityShell(
            router,
            workshopWorkOrderDetailHref(jobId),
            jobId,
            "push",
        );
    }
}

const PIPELINE_TAB_IDS = new Set<FleetReturnListPipelineTab>(
    TAB_DEFS.map((t) => t.id),
);

export default function VehicleReturnsDashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const canView =
        permissions.has("fleet_leasing.view") ||
        permissions.has("fleet_leasing.manage") ||
        permissions.has("asset_register.view") ||
        permissions.has("asset_register.manage");
    const canUpdateReturn =
        permissions.has("fleet_leasing.update") ||
        permissions.has("fleet_leasing.manage");

    const queryClient = useQueryClient();
    const [holdResolveRow, setHoldResolveRow] =
        useState<FleetReturnListItem | null>(null);

    const resolveHoldMutation = useMutation({
        mutationFn: async (inspectionId: string) => {
            if (!token || !organizationId) {
                throw new Error("Session not ready");
            }
            return resolveFleetReturnHoldApi({
                token,
                organizationId,
                inspectionId,
            });
        },
        onSuccess: async () => {
            showSuccessToast("Return hold cleared — finalize again when ready.");
            setHoldResolveRow(null);
            await queryClient.invalidateQueries({
                queryKey: ["fleet-returns", organizationId],
            });
        },
        onError: (err: Error) => {
            showErrorToast(err.message || "Could not resolve return hold.");
        },
    });

    const [activeTab, setActiveTab] =
        useState<FleetReturnListPipelineTab>("all_open");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [depotFilter, setDepotFilter] = useState("");
    const [reasonFilter, setReasonFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fromUrl = searchParams.get("pipelineTab");
        if (
            fromUrl &&
            PIPELINE_TAB_IDS.has(fromUrl as FleetReturnListPipelineTab)
        ) {
            setActiveTab(fromUrl as FleetReturnListPipelineTab);
            setCurrentPage(1);
        }
    }, [searchParams]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 300);
        return () => window.clearTimeout(handle);
    }, [search]);

    const depotQueryParams = useMemo(
        () => parseFleetReturnDepotFilterValue(depotFilter),
        [depotFilter],
    );

    const closingReasonParam = reasonFilter
        ? (reasonFilter as FleetReturnClosingReason)
        : undefined;

    const locationsQuery = useQuery({
        queryKey: ["organisation-locations-active", organizationId],
        queryFn: () =>
            fetchAllActiveOrganisationLocationsApi(token!, organizationId!),
        enabled: !!token && !!organizationId && canView,
        staleTime: 60_000,
    });

    const listQuery = useQuery({
        queryKey: [
            "fleet-returns",
            organizationId,
            activeTab,
            debouncedSearch,
            depotFilter,
            reasonFilter,
            currentPage,
        ],
        queryFn: () =>
            fetchFleetReturnsListApi({
                token: token!,
                organizationId: organizationId!,
                page: currentPage,
                pageSize: PAGE_SIZE,
                // Closing reason is cross-pipeline; combining with a tab hides released
                // vehicles (e.g. terminated_early + default "All open" excludes available).
                pipelineTab: closingReasonParam ? undefined : activeTab,
                search: debouncedSearch,
                includeTabCounts: true,
                closingReason: closingReasonParam,
                ...depotQueryParams,
            }),
        enabled:
            !!token &&
            !isAuthLoading &&
            !!organizationId &&
            canView,
        ...dashboardListQueryOptions,
        staleTime: 10_000,
        refetchOnWindowFocus: true,
        refetchInterval:
            activeTab === "workshop" || activeTab === "in_inspection"
                ? 15_000
                : false,
    });

    const items = listQuery.data?.items ?? [];
    const totalItems = listQuery.data?.total ?? 0;
    const totalPages = listQuery.data?.totalPages ?? 1;
    const tabCounts = listQuery.data?.tabCounts;

    const depotFilterOptions = useMemo(() => {
        const options: Array<{ label: string; value: string }> = [];
        const seen = new Set<string>();

        for (const loc of locationsQuery.data ?? []) {
            const value = `loc:${loc.id}`;
            if (!seen.has(value)) {
                seen.add(value);
                options.push({ label: loc.name, value });
            }
        }

        for (const opt of listQuery.data?.depotFilterOptions ?? []) {
            if (opt.returnDepotLocationId) {
                const value = `loc:${opt.returnDepotLocationId}`;
                if (!seen.has(value)) {
                    seen.add(value);
                    options.push({ label: opt.label, value });
                }
                continue;
            }
            if (opt.returnDepotLabel) {
                const value = `lbl:${opt.returnDepotLabel}`;
                if (!seen.has(value)) {
                    seen.add(value);
                    options.push({ label: opt.returnDepotLabel, value });
                }
            }
        }

        options.sort((a, b) => a.label.localeCompare(b.label));
        return options;
    }, [locationsQuery.data, listQuery.data?.depotFilterOptions]);

    const columns = [
        {
            key: "fleetCode",
            label: "FLEET CODE",
            className: "whitespace-nowrap font-medium",
            render: (row: FleetReturnListItem) => row.fleetCode,
        },
        {
            key: "registrationNo",
            label: "REGISTRATION",
            className: "whitespace-nowrap",
        },
        {
            key: "clientContract",
            label: "CLIENT · CONTRACT",
            sortable: false,
            render: (row: FleetReturnListItem) => (
                <span className="text-sm text-gray-900">
                    {row.clientName} · {row.contractNumber}
                </span>
            ),
        },
        {
            key: "reason",
            label: "REASON",
            sortable: false,
            render: (row: FleetReturnListItem) =>
                closingReasonLabel(row.contractClosingReason),
        },
        {
            key: "dueReceived",
            label: "DUE / RECEIVED",
            sortable: false,
            render: (row: FleetReturnListItem) => (
                <DashboardSemanticText urgency={vehicleReturnDueReceivedUrgency(row)}>
                    {vehicleReturnDueReceivedLabel(row)}
                </DashboardSemanticText>
            ),
        },
        {
            key: "stage",
            label: "STAGE",
            sortable: false,
            render: (row: FleetReturnListItem) => {
                const detail = vehicleReturnStageDetailLine(row);
                return (
                    <div className="flex flex-col gap-0.5">
                        <DashboardStageLabel
                            dotLevel={vehicleReturnStageDotLevel(row)}
                            labelClass={vehicleReturnStageLabelTextClass(row)}
                            label={vehicleReturnStageLabel(row)}
                        />
                        {detail ? (
                            <span className="pl-3.5 text-xs text-gray-500">
                                {detail}
                            </span>
                        ) : null}
                    </div>
                );
            },
        },
        {
            key: "nextStep",
            label: "NEXT STEP",
            sortable: false,
            className: "whitespace-nowrap text-right",
            render: (row: FleetReturnListItem) => {
                const actions = vehicleReturnNextStepActions(row);
                if (actions.length === 0) {
                    return <span className="text-sm text-gray-400">—</span>;
                }
                return (
                    <div className="flex min-w-max flex-row flex-nowrap items-center justify-end gap-2">
                        {actions.map((action) => (
                            <GrubpacButton
                                key={`${row.id}-${action.kind}`}
                                type="button"
                                size="sm"
                                variant={grubpacVariantForNextStep(
                                    action.variant,
                                )}
                                className={vehicleReturnNextStepButtonClass(
                                    action.variant,
                                )}
                                disabled={action.disabled}
                                title={action.disabledTitle}
                                onClick={() =>
                                    runNextStepAction(
                                        router,
                                        row,
                                        action.kind,
                                        action.workshopJobId,
                                        (target) => {
                                            if (!canUpdateReturn) return;
                                            setHoldResolveRow(target);
                                        },
                                    )
                                }
                            >
                                {action.label}
                            </GrubpacButton>
                        ))}
                    </div>
                );
            },
        },
    ];

    const handleClearFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setDepotFilter("");
        setReasonFilter("");
        setCurrentPage(1);
    };

    const isInitialLoading = listQuery.isLoading && !listQuery.data;

    return (
        <DashboardLayout
            title="Vehicle Returns"
            description="Receive vehicles coming back from clients, inspect them, and release them to the Available pool."
            action={
                SHOW_BULK_RECEIVE_HEADER_ACTION ? (
                    <GrubpacButton
                        type="button"
                        variant="secondary"
                        className="inline-flex items-center gap-2"
                        disabled
                        title={BULK_RECEIVE_DISABLED_TITLE}
                    >
                        Bulk receive
                    </GrubpacButton>
                ) : undefined
            }
            pagination={
                totalItems > 0
                    ? {
                          currentPage,
                          totalPages,
                          totalItems,
                          pageSize: PAGE_SIZE,
                          onPageChange: setCurrentPage,
                          previousButtonLabel: "Previous",
                          rangeSummarySuffix: "overdue first",
                      }
                    : undefined
            }
        >
            {!canView && !isAuthLoading ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
                    You do not have permission to view vehicle returns.
                </div>
            ) : null}

            <div className="mb-4 border-b border-gray-200">
                <div className="flex flex-wrap gap-4">
                    {TAB_DEFS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const count = tabCounts?.[tab.id];
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setCurrentPage(1);
                                }}
                                className={[
                                    "border-b-2 pb-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "border-[#FE5720] text-gray-900"
                                        : "border-transparent text-gray-500 hover:text-gray-700",
                                ].join(" ")}
                            >
                                {tab.label}
                                {typeof count === "number" ? (
                                    <DashboardPipelineTabCount
                                        count={count}
                                        level={vehicleReturnPipelineTabCountLevel(
                                            tab.id,
                                        )}
                                    />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </div>

            <DashboardFilters
                searchValue={search}
                searchPlaceholder="Search fleet code, registration, client or contract"
                onSearchChange={setSearch}
                selectFilters={[
                    {
                        key: "depot",
                        label: "All depots",
                        options: depotFilterOptions,
                    },
                    {
                        key: "reason",
                        label: "Any reason",
                        options: REASON_FILTER_OPTIONS,
                    },
                ]}
                filterValues={{
                    depot: depotFilter,
                    reason: reasonFilter,
                }}
                onFilterChange={(key, value) => {
                    if (key === "depot") {
                        setDepotFilter(value);
                    }
                    if (key === "reason") {
                        setReasonFilter(value);
                    }
                    setCurrentPage(1);
                }}
                onClear={handleClearFilters}
            />

            {listQuery.isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    Could not load vehicle returns.{" "}
                    <button
                        type="button"
                        className="font-medium underline"
                        onClick={() => void listQuery.refetch()}
                    >
                        Retry
                    </button>
                </div>
            ) : isInitialLoading ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                    Loading vehicle returns…
                </div>
            ) : items.length === 0 ? (
                <DashboardEmptyState
                    icon={
                        <PackageSearch
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No vehicle returns in this view"
                    description="Returns appear after lease end or register-return on a contract. Adjust search or tab filters."
                    buttonLabel="Clear filters"
                    onButtonClick={handleClearFilters}
                />
            ) : (
                <DashboardTable
                    columns={columns}
                    data={items}
                    getRowKey={(row) => row.id}
                    serverSorted
                />
            )}

            <ConfirmDialog
                open={holdResolveRow != null}
                title="Resolve return hold?"
                message={
                    holdResolveRow
                        ? `${holdResolveRow.fleetCode || holdResolveRow.registrationNo} will reopen for finalize review. The vehicle stays returned until you complete a new disposition.`
                        : ""
                }
                confirmLabel="Resolve hold"
                isConfirmPending={resolveHoldMutation.isPending}
                onClose={() => setHoldResolveRow(null)}
                onConfirm={() => {
                    if (!holdResolveRow) return;
                    resolveHoldMutation.mutate(holdResolveRow.id);
                }}
            />
        </DashboardLayout>
    );
}
