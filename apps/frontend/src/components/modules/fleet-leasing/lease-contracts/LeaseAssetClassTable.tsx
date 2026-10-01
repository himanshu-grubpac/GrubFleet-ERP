"use client";

import { DataTable, type Column } from "@grubpac/ui-kit";

export interface LeaseAssetClass {
    id: string;
    assetClass: string;
    committed: number;
    ratePerVehicle: string;
    availability: "Covered" | "Partial" | "Not Covered";
    lineStatusLabel?: string;
}

interface LeaseAssetClassTableProps {
    assetClasses: LeaseAssetClass[];
    /** Figma LEASE-06 active detail — qty + allocation status only */
    variant?: "default" | "allocation";
}

export default function LeaseAssetClassTable({
    assetClasses,
    variant = "default",
}: LeaseAssetClassTableProps) {
    const allocationColumns: Column<LeaseAssetClass>[] = [
        {
            header: "Asset class",
            accessorKey: "assetClass",
            sortable: true,
        },
        {
            header: "Qty",
            accessorKey: "committed",
            sortable: true,
        },
        {
            header: "Status",
            accessorKey: "lineStatusLabel",
            cell: ({ row }) => {
                const label = row.lineStatusLabel ?? "—";
                const isAllocated = label === "Allocated";
                return (
                    <span
                        className={
                            isAllocated
                                ? "rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700"
                                : "rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                        }
                    >
                        {label}
                    </span>
                );
            },
        },
    ];

    const columns: Column<LeaseAssetClass>[] =
        variant === "allocation"
            ? allocationColumns
            : [
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

            {assetClasses.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                    No asset-class lines on this contract yet.
                </p>
            ) : (
                <DataTable
                    data={assetClasses}
                    columns={columns}
                    getRowId={(row) => row.id}
                />
            )}
        </div>
    );
}
