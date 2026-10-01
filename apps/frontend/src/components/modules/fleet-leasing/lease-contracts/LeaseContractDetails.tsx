"use client";

import { useMemo, useState } from "react";

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

import type {
    LeaseContractAvailableActions,
    LeaseContractDetail,
} from "@/lib/api/lease-contracts";

import LeaseContractHeader, {
    type LeaseContractStatus,
} from "./LeaseContractHeader";

import LeaseAssetClassTable, {
    type LeaseAssetClass,
} from "./LeaseAssetClassTable";

import LeaseDeactivationNotice from "./LeaseDeactivationNotice";
import LeaseContractHistoryDialog, {
    type LeaseContractLogEntry,
} from "./LeaseContractHistoryDialog";
import { DashboardBreadcrumbsFromPath } from "@/components/dashboard/DashboardBreadcrumbsFromPath";
import { fetchOrganisationDriversApi } from "@/lib/api/organisation/drivers";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import type { ContractVehicle } from "@/lib/api/lease-contracts";

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
        annual: "Annually",
    };

    return map[value] ?? value;
}

function formatDisplayDate(iso: string | null): string {
    if (!iso) return "—";
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
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
            requestTermination: "request_termination",
            approveTermination: "approve_termination",
            renew: "renew",
        };
        return actions.includes(legacyMap[key] ?? key);
    }
    const entry = (actions as LeaseContractAvailableActions)[key];
    return entry?.allowed === true;
}

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

function ContractSummaryCard({
    clientName,
    billingFrequency,
    startDate,
    termMonths,
    securityDeposit,
}: {
    clientName: string;
    billingFrequency: string;
    startDate: string;
    termMonths: string;
    securityDeposit: string;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-4">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Contract
                </h2>
                <div className="mt-2 divide-y divide-slate-100">
                    <SummaryRow label="Client" value={clientName} />
                    <SummaryRow
                        label="Billing frequency"
                        value={billingFrequency}
                    />
                    <SummaryRow label="Start date" value={startDate} />
                    <SummaryRow label="Term" value={termMonths} />
                    <SummaryRow
                        label="Security deposit"
                        value={securityDeposit}
                    />
                </div>
            </div>
        </section>
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
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-4">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Vehicles &amp; drivers
                </h2>
                <ul className="mt-3 divide-y divide-slate-100">
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
                                        href={`/organization/driver-register/${linked.id}`}
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
            </div>
        </section>
    );
}

function SummaryRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-semibold text-slate-900">
                {value}
            </span>
        </div>
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

    const [historyOpen, setHistoryOpen] =
        useState(false);

    const leaseId =
        searchParams.get("leaseId") ?? "";

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

    const invalidate = () => {
        void queryClient.invalidateQueries({
            queryKey: [
                "lease-contract",
                leaseId,
                organizationId,
            ],
        });
    };

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

    const isActionPending =
        activate.isPending ||
        deactivate.isPending ||
        reactivate.isPending ||
        terminate.isPending;

    const historyLogs: LeaseContractLogEntry[] =
        useMemo(() => {
            if (!contract?.logs) return [];
            return (
                contract.logs as Array<
                    LeaseContractLogEntry & {
                        createdAt?: string;
                    }
                >
            ).map((log) => ({
                id: log.id,
                message: log.message,
                occurredAt: log.occurredAt ?? log.createdAt ?? "",
                actorLabel: log.actorLabel,
            }));
        }, [contract?.logs]);

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (isError || !contract) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
                Failed to load lease contract.
                Please go back and try again.
            </div>
        );
    }

    const status =
        toHeaderStatus(
            contract.status,
        );

    const description =
        contract.subtitle ??
        contract.description ??
        "";

    const useAllocationTable =
        status === "Active" &&
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

                lineStatusLabel:
                    line.lineStatusLabel ??
                    (line.availabilityCovered
                        ? "Allocated"
                        : "Awaiting Assets"),
            }),
        );

    const clientName =
        contract.client?.companyName ?? "—";

    const termLabel = contract.termMonths
        ? `${contract.termMonths} months`
        : "—";

    const banner = contract.statusBanner;

    return (
        <div className="space-y-6">
            <DashboardBreadcrumbsFromPath
                currentLabel={contract.contractNumber}
            />

            <LeaseContractHeader
                contractNumber={
                    contract.contractNumber
                }
                status={status}
                description={
                    description
                }
                onViewHistory={() =>
                    setHistoryOpen(true)
                }
                onActivate={
                    status === "Draft"
                        ? () =>
                            activate.mutate()
                        : undefined
                }
                onDeactivate={
                    isLeaseActionAllowed(
                        contract.availableActions,
                        "deactivate",
                    )
                        ? () =>
                            deactivate.mutate()
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
                        "requestTermination",
                    )
                        ? () =>
                            terminate.mutate()
                        : undefined
                }
                onEdit={
                    isLeaseActionAllowed(
                        contract.availableActions,
                        "editContract",
                    )
                        ? () =>
                            router.push(
                                `/fleet-leasing/lease-contracts/${leaseId}/edit`,
                            )
                        : undefined
                }
                isActionPending={isActionPending}
            />

            {banner?.text && (
                <div
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
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
            )}

            <ContractSummaryCard
                clientName={clientName}
                billingFrequency={formatBillingFrequency(
                    contract.billingFrequency,
                )}
                startDate={formatDisplayDate(
                    contract.startDate,
                )}
                termMonths={termLabel}
                securityDeposit={formatCurrency(
                    contract.securityDeposit,
                )}
            />

            <LeaseAssetClassTable
                assetClasses={
                    assetClasses
                }
                variant={
                    useAllocationTable
                        ? "allocation"
                        : "default"
                }
            />

            {organizationId && contract.vehicles?.length ? (
                <ContractVehicleDriverLinks
                    vehicles={contract.vehicles}
                    organizationId={organizationId}
                    token={token}
                />
            ) : null}

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

            <LeaseContractHistoryDialog
                isOpen={historyOpen}
                contractNumber={
                    contract.contractNumber
                }
                logs={historyLogs}
                onClose={() =>
                    setHistoryOpen(false)
                }
            />
        </div>
    );
}
