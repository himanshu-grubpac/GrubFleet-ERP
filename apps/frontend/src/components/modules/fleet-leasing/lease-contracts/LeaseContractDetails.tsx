"use client";

import { useMemo } from "react";

import Link from "next/link";
import {
    useSearchParams,
    useRouter,
} from "next/navigation";

import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { CheckCircle2 } from "lucide-react";

import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import {
  fleetLeaseContractChangeHistoryHref,
  fleetLeaseContractEditHref,
} from "@/lib/navigation/fleet-static-routes";
import { organisationDriverDetailHref } from "@/lib/navigation/organisation-static-routes";
import { useFleetEntityId } from "@/lib/navigation/use-fleet-entity-id";
import { ApiClientError } from "@/lib/api/client";
import {
    LEASE_CONTRACT_STATUS_UPDATE_ERROR,
    showErrorToast,
    showLeaseContractActivatedToast,
    showLeaseContractBillingPausedToast,
    showLeaseContractDeactivatedToast,
    showLeaseContractReactivatedToast,
    showLeaseContractTerminatedToast,
} from "@/lib/toast/show-toast";
import { canActivateLeaseContractByRawStatus } from "./lease-contract-list-row-actions";

import type {
    LeaseContractAvailableActions,
    LeaseContractDetail,
} from "@/lib/api/lease-contracts";

import LeaseContractHeader from "./LeaseContractHeader";

import LeaseAssetClassTable, {
    type LeaseAssetClass,
} from "./LeaseAssetClassTable";

import LeaseDeactivationNotice from "./LeaseDeactivationNotice";
import DetailField from "@/components/common/DetailField";
import OrganizationViewLayout from "@/components/common/OrganizationViewLayout";
import OrganizationDetailCard, {
    OrganizationDetailFieldGrid,
} from "@/components/common/OrganizationDetailCard";
import { fetchOrganisationDriversApi } from "@/lib/api/organisation/drivers";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import type {
    ContractVehicle,
    LeaseContractConfirmationSummary,
} from "@/lib/api/lease-contracts";
import { formatIndianRupee } from "@/lib/format/currency-format";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import {
    leaseContractHeaderStatusLabel,
} from "@/lib/lease-contract/lease-contract-status-display";

function formatBillingFrequency(
    value: string,
): string {
    const map: Record<string, string> = {
        monthly: "Monthly",
        quarterly: "Quarterly",
        annual: "Annually",
    };

    return map[value] ?? value;
}

function isLeaseActionAllowed(
    actions: LeaseContractDetail["availableActions"],
    key: keyof LeaseContractAvailableActions,
): boolean {
    if (!actions) return false;
    if (Array.isArray(actions)) {
        const legacyMap: Record<
            keyof LeaseContractAvailableActions,
            string
        > = {
            editContract: "edit",
            deactivate: "deactivate",
            reactivate: "reactivate",
            pauseBilling: "pause_billing",
            terminate: "terminate",
        };
        return actions.includes(legacyMap[key] ?? key);
    }
    const entry = (actions as LeaseContractAvailableActions)[key];
    return entry?.allowed === true;
}

function LoadingSkeleton() {
    return (
        <OrganizationViewLayout>
            <div className="animate-pulse space-y-6">
                <div className="h-6 w-48 rounded bg-slate-200" />
                <div className="h-24 w-full rounded-lg bg-slate-100" />
                <div className="h-40 w-full rounded-lg bg-slate-100" />
            </div>
        </OrganizationViewLayout>
    );
}

function ContractVehicleDriverLinks({
    vehicles,
    organizationId,
    token,
}: {
    vehicles: ContractVehicle[];
    organizationId: string;
    token: string | null | undefined;
}) {
    const driversQuery = useQuery({
        queryKey: [
            "organization",
            "drivers",
            "lease-contract-links",
            organizationId,
        ],
        queryFn: () =>
            fetchOrganisationDriversApi(token!, {
                organizationId,
                page: 1,
                pageSize: 50,
            }),
        enabled: Boolean(token) && vehicles.length > 0,
        ...dashboardListQueryOptions,
    });

    const driverByVehicleCode = useMemo(() => {
        const map = new Map<string, { id: string; name: string }>();
        for (const row of driversQuery.data?.items ?? []) {
            const code = row.assignedVehicle?.trim();
            if (code) {
                map.set(code, { id: row.id, name: row.name });
            }
        }
        return map;
    }, [driversQuery.data?.items]);

    if (vehicles.length === 0) {
        return null;
    }

    return (
        <OrganizationDetailCard>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Vehicles &amp; drivers
            </h2>
            <ul className="divide-y divide-slate-100">
                    {vehicles.map((vehicle) => {
                        const linked = driverByVehicleCode.get(
                            vehicle.registrationNo.trim(),
                        );
                        return (
                            <li
                                key={vehicle.id}
                                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                            >
                                <span className="font-medium text-slate-900">
                                    {vehicle.registrationNo}
                                </span>
                                {linked ? (
                                    <Link
                                        href={organisationDriverDetailHref(linked.id)}
                                        className="text-sm font-medium text-[#FE5720] hover:underline"
                                    >
                                        {linked.name}
                                    </Link>
                                ) : (
                                    <span className="text-slate-500">
                                        No driver linked
                                    </span>
                                )}
                            </li>
                        );
                    })}
            </ul>
        </OrganizationDetailCard>
    );
}

export default function LeaseContractDetails() {
    const searchParams =
        useSearchParams();

    const router = useRouter();

    const queryClient =
        useQueryClient();

    const { api, organizationId } =
        useLeaseApi();

    const { token } = useAuth();

    const leaseId = useFleetEntityId("leaseId");
    const showConfirmationSummary =
        searchParams.get("confirmed") === "1";

    const {
        data: contract,
        isLoading,
        isError,
    } = useQuery({
        queryKey: [
            "lease-contract",
            leaseId,
            organizationId,
        ],

        queryFn: () =>
            api.getById(leaseId),

        enabled:
            Boolean(organizationId) &&
            Boolean(leaseId),
    });

    const confirmationQuery = useQuery({
        queryKey: [
            "lease-contract-confirmation",
            leaseId,
            organizationId,
        ],
        queryFn: () => api.getConfirmation(leaseId),
        enabled:
            Boolean(organizationId) &&
            Boolean(leaseId) &&
            showConfirmationSummary,
        ...dashboardListQueryOptions,
        retry: false,
    });

    const invalidateLeaseContractCaches = () => {
        void queryClient.invalidateQueries({
            queryKey: ["lease-contract", leaseId, organizationId],
        });
        void queryClient.invalidateQueries({
            queryKey: ["lease-contract-detail", organizationId, leaseId],
        });
        void queryClient.invalidateQueries({
            queryKey: ["lease-contracts-list", organizationId],
        });
        void queryClient.invalidateQueries({
            queryKey: ["renewals-extensions-list", organizationId],
        });
    };

    const statusMutationError = (error: unknown) => {
        const message =
            error instanceof ApiClientError
                ? error.message || LEASE_CONTRACT_STATUS_UPDATE_ERROR
                : LEASE_CONTRACT_STATUS_UPDATE_ERROR;
        showErrorToast(message);
    };

    const activate = useMutation({
        mutationFn: () =>
            api.activate(leaseId),

        onSuccess: () => {
            invalidateLeaseContractCaches();
            showLeaseContractActivatedToast();
        },
        onError: statusMutationError,
    });

    const deactivate = useMutation({
        mutationFn: (reason: string) =>
            api.deactivate(leaseId, reason),

        onSuccess: () => {
            invalidateLeaseContractCaches();
            showLeaseContractDeactivatedToast();
        },
        onError: statusMutationError,
    });

    const reactivate = useMutation({
        mutationFn: () =>
            api.reactivate(leaseId),

        onSuccess: () => {
            invalidateLeaseContractCaches();
            showLeaseContractReactivatedToast();
        },
        onError: statusMutationError,
    });

    const terminate = useMutation({
        mutationFn: () => api.terminate(leaseId),
        onSuccess: () => {
            invalidateLeaseContractCaches();
            showLeaseContractTerminatedToast();
        },
        onError: statusMutationError,
    });

    const pauseBilling = useMutation({
        mutationFn: () => api.pauseBilling(leaseId),
        onSuccess: () => {
            invalidateLeaseContractCaches();
            showLeaseContractBillingPausedToast();
        },
        onError: statusMutationError,
    });

    const isActionPending =
        activate.isPending ||
        deactivate.isPending ||
        reactivate.isPending ||
        terminate.isPending ||
        pauseBilling.isPending;

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (isError || !contract) {
        return (
            <OrganizationViewLayout>
                <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm font-medium text-red-600">
                        Failed to load lease contract.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="text-sm text-gray-600 underline"
                    >
                        Go back
                    </button>
                </div>
            </OrganizationViewLayout>
        );
    }

    const statusLabel = leaseContractHeaderStatusLabel(
        contract.status,
        contract.rawStatus,
    );

    const description = contract.subtitle ?? "";

    const useAllocationTable =
        contract.rawStatus === "active" &&
        (contract.contractFullyAllocated ?? false);

    const assetClasses: LeaseAssetClass[] =
        contract.assetLines.map(
            (line) => ({
                id: line.id,

                assetClass:
                    line.assetClass,

                committed:
                    line.committedQuantity,

                ratePerVehicle:
                    formatIndianRupee(
                        line.ratePerVehicleMonth,
                    ),

                availability:
                    line.availabilityCovered
                        ? "Covered"
                        : line.shortfallCount >
                            0 &&
                            line.availableNowCount >
                            0
                            ? "Partial"
                            : "Not Covered",

                lineStatusLabel:
                    line.lineStatusLabel ??
                    (line.lineAllocationStatus === "allocated"
                        ? "Allocated"
                        : line.lineAllocationStatus === "partially_allocated"
                          ? "Partially allocated"
                          : line.awaitingAssetsLine
                            ? "Awaiting assets"
                            : "—"),
            }),
        );

    const clientName =
        contract.client?.companyName ?? "—";

    const termLabel = contract.termMonths
        ? `${contract.termMonths} months`
        : "—";

    const isTerminalClosed =
        contract.rawStatus === "closed" ||
        contract.rawStatus === "concluded";
    const banner =
        contract.statusBanner?.text &&
        !isTerminalClosed &&
        !(
            contract.rawStatus === "active" &&
            contract.statusBanner.level === "success"
        )
            ? contract.statusBanner
            : null;
    const confirmation: LeaseContractConfirmationSummary | undefined =
        confirmationQuery.data;

    const changeHistoryHref = contract.hasFieldChangeHistory
        ? fleetLeaseContractChangeHistoryHref(leaseId)
        : undefined;

    return (
        <OrganizationViewLayout>
            <LeaseContractHeader
                contractNumber={
                    contract.contractNumber
                }
                statusLabel={statusLabel}
                description={
                    description
                }
                onActivate={
                    canActivateLeaseContractByRawStatus(
                        contract.rawStatus,
                    )
                        ? () =>
                            activate.mutate()
                        : undefined
                }
                onDeactivate={
                    isLeaseActionAllowed(
                        contract.availableActions,
                        "deactivate",
                    )
                        ? (reason) =>
                            deactivate.mutate(reason)
                        : undefined
                }
                onReactivate={
                    isLeaseActionAllowed(
                        contract.availableActions,
                        "reactivate",
                    )
                        ? () =>
                            reactivate.mutate()
                        : undefined
                }
                onTerminate={
                    isLeaseActionAllowed(
                        contract.availableActions,
                        "terminate",
                    )
                        ? () => terminate.mutate()
                        : undefined
                }
                onPauseBilling={
                    isLeaseActionAllowed(
                        contract.availableActions,
                        "pauseBilling",
                    )
                        ? () => pauseBilling.mutate()
                        : undefined
                }
                onEdit={
                    isLeaseActionAllowed(
                        contract.availableActions,
                        "editContract",
                    )
                        ? () =>
                            router.push(
                                fleetLeaseContractEditHref(leaseId),
                            )
                        : undefined
                }
                historyHref={changeHistoryHref}
                isActionPending={isActionPending}
            />

            {showConfirmationSummary && confirmation ? (
                <OrganizationDetailCard className="mt-4">
                    <h2 className="mb-2 text-sm font-semibold text-slate-900">
                        {confirmation.headline}
                    </h2>
                    {confirmation.infoMessages.map((msg) => (
                        <p
                            key={msg}
                            className="mb-2 text-sm text-slate-600"
                        >
                            {msg}
                        </p>
                    ))}
                    <LeaseAssetClassTable
                        assetClasses={confirmation.allocationByLine.map(
                            (line) => ({
                                id: line.assetClass,
                                assetClass: line.assetClass,
                                committed: line.committedQuantity,
                                ratePerVehicle: "—",
                                availability:
                                    line.lineStatus === "allocated"
                                        ? "Covered"
                                        : line.lineStatus ===
                                            "partially_allocated"
                                          ? "Partial"
                                          : "Not Covered",
                                lineStatusLabel: line.lineStatusLabel,
                            }),
                        )}
                        variant="allocation"
                    />
                </OrganizationDetailCard>
            ) : null}

            {banner?.text ? (
                <div
                    className={`mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                        banner.level === "success"
                            ? "border-green-200 bg-green-50 text-green-800"
                            : banner.level === "warning"
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                    role="status"
                >
                    {banner.level === "success" && (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    )}
                    <span>{banner.text}</span>
                </div>
            ) : null}

            <OrganizationDetailCard className="mt-4">
                <OrganizationDetailFieldGrid>
                    <DetailField label="Client" value={clientName} />
                    <DetailField
                        label="Billing frequency"
                        value={formatBillingFrequency(
                            contract.billingFrequency,
                        )}
                    />
                    <DetailField
                        label="Start date"
                        value={formatCalendarDateEnIn(contract.startDate)}
                    />
                    <DetailField label="Term" value={termLabel} />
                    <DetailField
                        label="Security deposit"
                        value={formatIndianRupee(contract.securityDeposit)}
                    />
                </OrganizationDetailFieldGrid>
            </OrganizationDetailCard>

            <div className="mt-4">
                <OrganizationDetailCard>
                    <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Asset lines
                    </h2>
                    <LeaseAssetClassTable
                        assetClasses={assetClasses}
                        variant={
                            useAllocationTable ? "allocation" : "default"
                        }
                    />
                </OrganizationDetailCard>
            </div>

            {organizationId && contract.vehicles?.length ? (
                <div className="mt-4">
                    <ContractVehicleDriverLinks
                        vehicles={contract.vehicles}
                        organizationId={organizationId}
                        token={token}
                    />
                </div>
            ) : null}

            {contract.rawStatus === "deactivated" ? (
                <div className="mt-4">
                    <LeaseDeactivationNotice
                        returnedVehicles={
                            contract
                                .returnProgress
                                .returnedRegisteredCount
                        }
                        totalVehicles={
                            contract
                                .returnProgress
                                .committedVehicleCount
                        }
                    />
                </div>
            ) : null}
        </OrganizationViewLayout>
    );
}
