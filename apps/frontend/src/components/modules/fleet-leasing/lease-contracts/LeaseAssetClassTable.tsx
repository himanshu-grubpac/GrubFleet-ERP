"use client";

import { DataTable, type Column } from "@grubpac/ui-kit";

export interface LeaseAssetClass {
    id: string;
    assetClass: string;
    committed: number;
    ratePerVehicle: string;
    availability: "Covered" | "Partial" | "Not Covered";
}

interface LeaseAssetClassTableProps {
    assetClasses?: LeaseAssetClass[];
}

// ============================================================
// MOCK DATA
// Later this will come from the Lease Contract API
// ============================================================

const mockAssetClasses: LeaseAssetClass[] = [
    {
        id: "asset-class-1",
        assetClass: "Sedan",
        committed: 3,
        ratePerVehicle: "Rs. 34,500",
        availability: "Covered",
    },
    {
        id: "asset-class-2",
        assetClass: "SUV",
        committed: 4,
        ratePerVehicle: "Rs. 41,000",
        availability: "Covered",
    },
    {
        id: "asset-class-3",
        assetClass: "Pickup",
        committed: 2,
        ratePerVehicle: "Rs. 28,000",
        availability: "Covered",
    },
];

export default function LeaseAssetClassTable({
    assetClasses = mockAssetClasses,
}: LeaseAssetClassTableProps) {
    const columns: Column<LeaseAssetClass>[] = [
        {
            header: "Asset Class",
            accessorKey: "assetClass",
            sortable: true,
        },
        {
            header: "Committed",
            accessorKey: "committed",
            sortable: true,
        },
        {
            header: "Rate / Vehicle / Month",
            accessorKey: "ratePerVehicle",
            sortable: true,
        },
        {
            header: "Availability",
            accessorKey: "availability",
            cell: ({ row }) => {
                const availability = row.availability;

                return (
                    <span
                        className={
                            availability === "Covered"
                                ? "rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700"
                                : availability === "Partial"
                                    ? "rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                                    : "rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
                        }
                    >
                        {availability}
                    </span>
                );
            },
        },
    ];

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 pt-5">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Asset-Class Lines
                </h2>
            </div>

            <DataTable
                data={assetClasses}
                columns={columns}
                getRowId={(row) => row.id}
            />
        </div>
    );
}