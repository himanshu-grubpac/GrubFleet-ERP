"use client";

import {
    useSearchParams,
    useRouter,
} from "next/navigation";

import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { useLeaseApi } from "@/lib/api/lease-contracts-context";

import LeaseContractHeader, {
    type LeaseContractStatus,
} from "./LeaseContractHeader";

import LeaseAssetClassTable, {
    type LeaseAssetClass,
} from "./LeaseAssetClassTable";

import LeaseContractTerms from "./LeaseContractTerms";

import LeaseDeactivationNotice from "./LeaseDeactivationNotice";

// ─── Status mapper ────────────────────────────────────────────────────────────

function toHeaderStatus(
    apiStatus: string,
): LeaseContractStatus {
    const map: Record<
        string,
        LeaseContractStatus
    > = {
        Active: "Active",
        Draft: "Draft",
        Deactivated: "Deactivated",
        Terminated: "Terminated",
        Closed: "Terminated",
    };

    return map[apiStatus] ?? "Draft";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(
    value: number | null,
): string {
    if (value == null) return "—";

    return `Rs. ${value.toLocaleString(
        "en-IN",
    )}`;
}

function formatBillingFrequency(
    value: string,
): string {
    const map: Record<string, string> = {
        monthly: "Monthly",
        quarterly: "Quarterly",
        annually: "Annually",
    };

    return map[value] ?? value;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="h-6 w-48 rounded bg-slate-200" />

            <div className="h-24 w-full rounded-xl bg-slate-100" />

            <div className="h-40 w-full rounded-xl bg-slate-100" />

            <div className="h-28 w-full rounded-xl bg-slate-100" />
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeaseContractDetails() {
    const searchParams =
        useSearchParams();

    const router = useRouter();

    const queryClient =
        useQueryClient();

    const { api, organizationId } =
        useLeaseApi();

    // ============================================================
    // GET LEASE ID FROM QUERY PARAM
    //
    // URL:
    // /fleet-leasing/lease-contracts/detail?leaseId=xxxxx
    // ============================================================

    const leaseId =
        searchParams.get("leaseId") ?? "";

    // ============================================================
    // FETCH CONTRACT
    // ============================================================

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

    // ============================================================
    // INVALIDATE CONTRACT
    // ============================================================

    const invalidate = () => {
        void queryClient.invalidateQueries({
            queryKey: [
                "lease-contract",
                leaseId,
                organizationId,
            ],
        });
    };

    // ============================================================
    // ACTIONS
    // ============================================================

    const activate = useMutation({
        mutationFn: () =>
            api.activate(leaseId),

        onSuccess: invalidate,
    });

    const deactivate = useMutation({
        mutationFn: () =>
            api.deactivate(leaseId),

        onSuccess: invalidate,
    });

    const reactivate = useMutation({
        mutationFn: () =>
            api.reactivate(leaseId),

        onSuccess: invalidate,
    });

    const terminate = useMutation({
        mutationFn: () =>
            api.requestTermination(
                leaseId,
            ),

        onSuccess: invalidate,
    });

    // ============================================================
    // LOADING
    // ============================================================

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    // ============================================================
    // ERROR
    // ============================================================

    if (isError || !contract) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
                Failed to load lease contract.
                Please go back and try again.
            </div>
        );
    }

    // ============================================================
    // DERIVED VALUES
    // ============================================================

    const status =
        toHeaderStatus(
            contract.status,
        );

    /*
     * The API/type currently expects availableActions
     * to be an array, but the runtime response is not
     * guaranteed to have that shape.
     *
     * Guard it before using .includes().
     */
    const availableActions =
        Array.isArray(
            contract.availableActions,
        )
            ? contract.availableActions
            : [];

    const description =
        contract.subtitle ??
        contract.description ??
        "";

    // ============================================================
    // ASSET CLASSES
    // ============================================================

    const assetClasses: LeaseAssetClass[] =
        contract.assetLines.map(
            (line) => ({
                id: line.id,

                assetClass:
                    line.assetClass,

                committed:
                    line.committedQuantity,

                ratePerVehicle:
                    formatCurrency(
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
            }),
        );

    // ============================================================
    // TIME PERIOD
    // ============================================================

    const timePeriod =
        contract.termMonths
            ? `${contract.termMonths} months`
            : contract.startDate &&
                contract.endDate
                ? `${contract.startDate} – ${contract.endDate}`
                : "—";

    // ============================================================
    // UI
    // ============================================================

    return (
        <div className="space-y-6">
            {/* =====================================================
                CONTRACT HEADER
            ====================================================== */}

            <LeaseContractHeader
                contractNumber={
                    contract.contractNumber
                }
                status={status}
                description={
                    description
                }
                onActivate={
                    availableActions.includes(
                        "activate",
                    )
                        ? () =>
                            activate.mutate()
                        : undefined
                }
                onDeactivate={
                    availableActions.includes(
                        "deactivate",
                    )
                        ? () =>
                            deactivate.mutate()
                        : undefined
                }
                onReactivate={
                    availableActions.includes(
                        "reactivate",
                    )
                        ? () =>
                            reactivate.mutate()
                        : undefined
                }
                onTerminate={
                    availableActions.includes(
                        "request_termination",
                    )
                        ? () =>
                            terminate.mutate()
                        : undefined
                }
                onEdit={() =>
                    router.push(
                        `/fleet-leasing/lease-contracts/${leaseId}/edit`,
                    )
                }
            />

            {/* =====================================================
                ASSET CLASS LINES
            ====================================================== */}

            <LeaseAssetClassTable
                assetClasses={
                    assetClasses
                }
            />

            {/* =====================================================
                TERMS
            ====================================================== */}

            <LeaseContractTerms
                timePeriod={
                    timePeriod
                }
                securityDeposit={formatCurrency(
                    contract.securityDeposit,
                )}
                billingFrequency={formatBillingFrequency(
                    contract.billingFrequency,
                )}
            />

            {/* =====================================================
                DEACTIVATION NOTICE
            ====================================================== */}

            {status ===
                "Deactivated" && (
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
                )}
        </div>
    );
}