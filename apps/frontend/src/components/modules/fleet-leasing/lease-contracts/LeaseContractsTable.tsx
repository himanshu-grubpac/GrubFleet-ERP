"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "@grubpac/ui-kit";
import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import type { LeaseContractListItem } from "@/lib/api/lease-contracts";

// ─── KPI Summary Bar ──────────────────────────────────────────────────────────

function SummaryBar({
    activeContracts,
    awaitingAssets,
    pendingApproval,
    draft,
}: {
    activeContracts: number;
    awaitingAssets: number;
    pendingApproval: number;
    draft: number;
}) {
    const stats = [
        { label: "Active", value: activeContracts, color: "text-green-600" },
        { label: "Awaiting Assets", value: awaitingAssets, color: "text-amber-600" },
        { label: "Pending Approval", value: pendingApproval, color: "text-blue-600" },
        { label: "Draft", value: draft, color: "text-slate-500" },
    ];

    return (
        <div className="flex gap-6 border-b border-slate-100 px-5 py-3">
            {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                    <span className="text-xs text-slate-500">{s.label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        Active: "bg-green-100 text-green-700",
        Draft: "bg-amber-100 text-amber-700",
        "Pending Approval": "bg-blue-100 text-blue-700",
        "Awaiting Assets": "bg-orange-100 text-orange-700",
        Deactivated: "bg-slate-100 text-slate-600",
        "Billing Paused": "bg-purple-100 text-purple-700",
        "Pending Termination": "bg-red-100 text-red-600",
        Closed: "bg-slate-100 text-slate-500",
    };
    return (
        <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"
                }`}
        >
            {status}
        </span>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export default function LeaseContractsTable() {
    const { api, organizationId } = useLeaseApi();

    const { data: summary } = useQuery({
        queryKey: ["lease-contracts-summary", organizationId],
        queryFn: () => api.getSummary(),
        enabled: !!organizationId,
    });

    const {
        data: listData,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["lease-contracts-list", organizationId],
        queryFn: () => api.getList(),
        enabled: !!organizationId,
    });

    const contracts: LeaseContractListItem[] = listData?.items ?? [];

    const columns: Column<LeaseContractListItem>[] = [
        {
            header: "Contract No.",
            accessorKey: "contractNumber",
            sortable: true,
        },
        {
            header: "Company Name",
            accessorKey: "clientName",
            sortable: true,
        },
        {
            header: "Asset Class",
            accessorKey: "assetClasses",
            sortable: true,
        },
        {
            header: "Start Date",
            accessorKey: "startDate",
            sortable: true,
            cell: ({ row }) => <span>{row.startDate ?? "—"}</span>,
        },
        {
            header: "Status",
            accessorKey: "status",
            sortable: true,
            cell: ({ row }) => <StatusBadge status={row.status} />,
        },
        {
            header: "Action",
            accessorKey: "id",
            headerClassName: "text-right",
            className: "text-right",
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Link
                        href={`/fleet-leasing/lease-contracts/detail/?leaseId=${encodeURIComponent(row.id)}`}
                        className="font-medium text-[#FE5720] transition-colors hover:text-[#e94d1c] hover:underline"
                    >
                        View
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {summary && <SummaryBar {...summary} />}

            {isLoading && (
                <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                    Loading contracts…
                </div>
            )}

            {isError && !isLoading && (
                <div className="flex items-center justify-center py-16 text-sm text-red-500">
                    Failed to load lease contracts. Please try again.
                </div>
            )}

            {!isLoading && !isError && (
                <DataTable
                    data={contracts}
                    columns={columns}
                    getRowId={(row) => row.id}
                />
            )}
        </div>
    );
}