"use client";

import Link from "next/link";
import { DataTable, type Column } from "@grubpac/ui-kit";

export interface LeaseContract {
    id: string;
    contractNumber: string;
    companyName: string;
    assetClass: string;
    startingDate: string;
}

interface LeaseContractsTableProps {
    contracts?: LeaseContract[];
}

// ============================================================
// MOCK DATA
// Later this will come from the Lease Contracts API
// ============================================================

const mockLeaseContracts: LeaseContract[] = [
    {
        id: "LC-2041",
        contractNumber: "LC-2041",
        companyName: "Meridian Logistics Pvt. Ltd.",
        assetClass: "SUV",
        startingDate: "01/10/2026",
    },
];

export default function LeaseContractsTable({
    contracts = mockLeaseContracts,
}: LeaseContractsTableProps) {
    const columns: Column<LeaseContract>[] = [
        {
            header: "Contract No.",
            accessorKey: "contractNumber",
            sortable: true,
        },
        {
            header: "Company Name",
            accessorKey: "companyName",
            sortable: true,
        },
        {
            header: "Asset Class",
            accessorKey: "assetClass",
            sortable: true,
        },
        {
            header: "Starting Date",
            accessorKey: "startingDate",
            sortable: true,
        },
        {
            header: "Action",
            accessorKey: "id",
            headerClassName: "text-right",
            className: "text-right",
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Link
                        href={`/fleet-leasing/lease-contracts/${row.id}`}
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
            <DataTable
                data={contracts}
                columns={columns}
                getRowId={(row) => row.id}
            />
        </div>
    );
}