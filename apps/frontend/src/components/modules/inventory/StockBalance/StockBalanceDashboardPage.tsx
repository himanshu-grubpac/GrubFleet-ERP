"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Info, PackageSearch } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type StockStatus =
    | "In Stock"
    | "Low Stock"
    | "Out of Stock";

type StockLocation = {
    location: string;
    quantity: number;
};

type StockBalance = {
    id: string;
    partName: string;
    partNumber: string;
    unit: string;
    locations: StockLocation[];
    threshold: number;
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_STOCK_BALANCES: StockBalance[] = [
    {
        id: "stock-001",
        partName: "Brake Pad Set (Front+Rear)",
        partNumber: "PRT-10018",
        unit: "Set",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 28,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 14,
            },
        ],
        threshold: 20,
    },

    {
        id: "stock-002",
        partName: "Tyre — 3.00-10",
        partNumber: "PRT-10007",
        unit: "Each",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 18,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 32,
            },
        ],
        threshold: 15,
    },

    {
        id: "stock-003",
        partName: "Chain Sprocket Kit",
        partNumber: "PRT-10025",
        unit: "Kit",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 7,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 9,
            },
        ],
        threshold: 10,
    },

    {
        id: "stock-004",
        partName: "Air Filter",
        partNumber: "PRT-10033",
        unit: "Each",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 22,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 19,
            },
        ],
        threshold: 15,
    },

    {
        id: "stock-005",
        partName: "Spark Plug",
        partNumber: "PRT-10041",
        unit: "Each",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 12,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 11,
            },
        ],
        threshold: 10,
    },

    {
        id: "stock-006",
        partName: "Clutch Plate Set",
        partNumber: "PRT-10052",
        unit: "Set",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 5,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 3,
            },
        ],
        threshold: 10,
    },

    {
        id: "stock-007",
        partName: "Headlamp Assembly",
        partNumber: "PRT-10063",
        unit: "Each",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 16,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 12,
            },
        ],
        threshold: 10,
    },

    {
        id: "stock-008",
        partName: "Cargo Box Hinge Kit",
        partNumber: "PRT-10091",
        unit: "Kit",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 4,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 6,
            },
        ],
        threshold: 12,
    },

    {
        id: "stock-009",
        partName: "Engine Oil (1L)",
        partNumber: "PRT-10102",
        unit: "Litre",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 45,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 38,
            },
        ],
        threshold: 20,
    },

    {
        id: "stock-010",
        partName: "Rear Shock Absorber",
        partNumber: "PRT-10114",
        unit: "Each",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 8,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 5,
            },
        ],
        threshold: 15,
    },

    {
        id: "stock-011",
        partName: "Clutch Cable",
        partNumber: "PRT-10121",
        unit: "Each",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 19,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 13,
            },
        ],
        threshold: 12,
    },

    {
        id: "stock-012",
        partName: "Brake Shoe Set",
        partNumber: "PRT-10132",
        unit: "Set",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 2,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 3,
            },
        ],
        threshold: 10,
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getTotalOnHand = (stock: StockBalance) => {
    return stock.locations.reduce(
        (total, location) =>
            total + location.quantity,
        0,
    );
};

const getStockStatus = (
    stock: StockBalance,
): StockStatus => {
    const totalOnHand =
        getTotalOnHand(stock);

    if (totalOnHand === 0) {
        return "Out of Stock";
    }

    if (totalOnHand <= stock.threshold) {
        return "Low Stock";
    }

    return "In Stock";
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StockBalanceDashboardPage() {
    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [stockBalances] =
        useState<StockBalance[]>(
            MOCK_STOCK_BALANCES,
        );

    const [search, setSearch] =
        useState("");

    const [filters, setFilters] =
        useState<Record<string, string>>({
            stockStatus: "",
            location: "",
        });

    const [currentPage, setCurrentPage] =
        useState(1);

    /* ---------------------------------------------------------------------- */
    /* Location Options                                                       */
    /* ---------------------------------------------------------------------- */

    const locationOptions = useMemo(() => {
        const locations = Array.from(
            new Set(
                stockBalances.flatMap(
                    (stock) =>
                        stock.locations.map(
                            (location) =>
                                location.location,
                        ),
                ),
            ),
        );

        return locations.map(
            (location) => ({
                label: location,
                value: location,
            }),
        );
    }, [stockBalances]);

    /* ---------------------------------------------------------------------- */
    /* Filter Data                                                             */
    /* ---------------------------------------------------------------------- */

    const filteredStockBalances =
        useMemo(() => {
            const searchValue =
                search
                    .trim()
                    .toLowerCase();

            return stockBalances.filter(
                (stock) => {
                    const matchesSearch =
                        !searchValue ||
                        stock.partName
                            .toLowerCase()
                            .includes(
                                searchValue,
                            ) ||
                        stock.partNumber
                            .toLowerCase()
                            .includes(
                                searchValue,
                            );

                    const stockStatus =
                        getStockStatus(
                            stock,
                        );

                    const matchesStockStatus =
                        !filters.stockStatus ||
                        stockStatus ===
                        filters.stockStatus;

                    const matchesLocation =
                        !filters.location ||
                        stock.locations.some(
                            (location) =>
                                location.location ===
                                filters.location,
                        );

                    return (
                        matchesSearch &&
                        matchesStockStatus &&
                        matchesLocation
                    );
                },
            );
        }, [
            search,
            filters,
            stockBalances,
        ]);

    /* ---------------------------------------------------------------------- */
    /* Reset Pagination When Filters Change                                   */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filters]);

    /* ---------------------------------------------------------------------- */
    /* Pagination                                                             */
    /* ---------------------------------------------------------------------- */

    const totalItems =
        filteredStockBalances.length;

    const totalPages = Math.max(
        1,
        Math.ceil(
            totalItems / PAGE_SIZE,
        ),
    );

    const paginatedStockBalances =
        useMemo(() => {
            const startIndex =
                (currentPage - 1) *
                PAGE_SIZE;

            const endIndex =
                startIndex + PAGE_SIZE;

            return filteredStockBalances.slice(
                startIndex,
                endIndex,
            );
        }, [
            filteredStockBalances,
            currentPage,
        ]);

    /* ---------------------------------------------------------------------- */
    /* Clear Filters                                                          */
    /* ---------------------------------------------------------------------- */

    const handleClearFilters = () => {
        setSearch("");

        setFilters({
            stockStatus: "",
            location: "",
        });

        setCurrentPage(1);
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                          */
    /* ---------------------------------------------------------------------- */

    const stockColumns = [
        {
            key: "partName",
            label: "PART",

            render: (
                stock: StockBalance,
            ) => (
                <div className="min-w-0">
                    <p
                        className="truncate font-medium text-gray-900"
                        title={
                            stock.partName
                        }
                    >
                        {stock.partName}
                    </p>

                    <p className="mt-0.5 text-[11px] text-gray-400">
                        {stock.unit}
                    </p>
                </div>
            ),
        },

        {
            key: "partNumber",
            label: "PART NO.",

            render: (
                stock: StockBalance,
            ) => (
                <span className="whitespace-nowrap text-sm font-medium text-gray-600">
                    {stock.partNumber}
                </span>
            ),
        },

        {
            key: "stockByLocation",
            label: "STOCK BY LOCATION",

            render: (
                stock: StockBalance,
            ) => (
                <div className="min-w-0 space-y-0.5">
                    {stock.locations.map(
                        (location) => (
                            <p
                                key={
                                    location.location
                                }
                                className="truncate text-sm text-gray-600"
                                title={`${location.location} ${location.quantity}`}
                            >
                                {
                                    location.location
                                }{" "}
                                <span className="font-medium text-gray-800">
                                    {
                                        location.quantity
                                    }
                                </span>
                            </p>
                        ),
                    )}
                </div>
            ),
        },

        {
            key: "totalOnHand",
            label: "TOTAL ON-HAND",

            render: (
                stock: StockBalance,
            ) => (
                <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                    {
                        getTotalOnHand(
                            stock,
                        )
                    }{" "}
                    {stock.unit}
                </span>
            ),
        },

        {
            key: "status",
            label: "STATUS",

            render: (
                stock: StockBalance,
            ) => {
                const status =
                    getStockStatus(
                        stock,
                    );

                const totalOnHand =
                    getTotalOnHand(
                        stock,
                    );

                const statusClasses = {
                    "In Stock":
                        "bg-green-50 text-green-700",

                    "Low Stock":
                        "bg-orange-50 text-[#FE5720]",

                    "Out of Stock":
                        "bg-red-50 text-red-700",
                };

                const statusDescription = {
                    "In Stock":
                        "Stock is currently above the threshold.",

                    "Low Stock":
                        "Stock is below the threshold.",

                    "Out of Stock":
                        "Stock needs replenishment.",
                };

                return (
                    <div className="group relative inline-flex">
                        {/* Status Badge */}

                        <span
                            className={[
                                "inline-flex cursor-default items-center rounded-full px-2.5 py-1",
                                "whitespace-nowrap text-xs font-medium",
                                statusClasses[
                                status
                                ],
                            ].join(" ")}
                        >
                            {status}
                        </span>

                        {/* Status Tooltip */}

                        <div
                            className="
                                pointer-events-none
                                invisible
                                absolute
                                left-1/2
                                top-full
                                z-50
                                mt-2
                                w-56
                                -translate-x-1/2
                                rounded-lg
                                border
                                border-gray-200
                                bg-white
                                p-3
                                shadow-xl
                                opacity-0
                                transition-all
                                duration-150
                                group-hover:visible
                                group-hover:opacity-100
                            "
                        >
                            {/* Tooltip Arrow */}

                            <div
                                className="
                                    absolute
                                    -top-1
                                    left-1/2
                                    h-2
                                    w-2
                                    -translate-x-1/2
                                    rotate-45
                                    border-l
                                    border-t
                                    border-gray-200
                                    bg-white
                                "
                            />

                            <div className="relative">
                                <div className="mb-3">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {status}
                                    </p>

                                    <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
                                        Stock availability
                                    </p>
                                </div>

                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-gray-500">
                                            Threshold
                                        </span>

                                        <span className="text-xs font-semibold text-gray-900">
                                            {
                                                stock.threshold
                                            }{" "}
                                            {
                                                stock.unit
                                            }
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-gray-500">
                                            Currently
                                        </span>

                                        <span className="text-xs font-semibold text-gray-900">
                                            {
                                                totalOnHand
                                            }{" "}
                                            {
                                                stock.unit
                                            }
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 border-t border-gray-100 pt-2.5">
                                    <p className="text-[11px] leading-4 text-gray-500">
                                        {
                                            statusDescription[
                                            status
                                            ]
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            },
        },
    ];

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <DashboardLayout
            title="Stock Balance"
            description="Current on-hand quantity for every part, across every location."
            pagination={{
                currentPage,
                totalPages,
                totalItems,
                pageSize: PAGE_SIZE,
                onPageChange:
                    setCurrentPage,
            }}
        >
            {/* ================================================================== */}
            {/* Filters                                                            */}
            {/* ================================================================== */}

            <DashboardFilters
                searchValue={search}
                searchPlaceholder="Search by part name or part number"
                onSearchChange={setSearch}
                selectFilters={[
                    {
                        key: "stockStatus",
                        label: "Stock Status",
                        options: [
                            {
                                label: "In Stock",
                                value: "In Stock",
                            },
                            {
                                label: "Low Stock",
                                value: "Low Stock",
                            },
                            {
                                label: "Out of Stock",
                                value: "Out of Stock",
                            },
                        ],
                    },

                    {
                        key: "location",
                        label: "Location",
                        options:
                            locationOptions,
                    },
                ]}
                filterValues={filters}
                onFilterChange={(
                    key,
                    value,
                ) => {
                    setFilters(
                        (previous) => ({
                            ...previous,
                            [key]: value,
                        }),
                    );
                }}
                onClear={
                    handleClearFilters
                }
            />

            {/* ================================================================== */}
            {/* Empty State                                                        */}
            {/* ================================================================== */}

            {filteredStockBalances.length ===
                0 ? (
                <DashboardEmptyState
                    icon={
                        <PackageSearch
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No stock levels found"
                    description="Try changing your search or filters."
                    buttonLabel="Clear filters"
                    onButtonClick={
                        handleClearFilters
                    }
                />
            ) : (
                <>
                    {/* ========================================================== */}
                    {/* Stock Balance Table                                        */}
                    {/* ========================================================== */}

                    <DashboardTable
                        columns={
                            stockColumns
                        }
                        data={
                            paginatedStockBalances
                        }
                        getRowKey={(stock) =>
                            stock.id
                        }
                        renderActions={(
                            stock,
                        ) => (
                            <div className="flex items-center justify-end">
                                <Link
                                    href={`/inventory/stock-balance/${stock.id}`}
                                    className="whitespace-nowrap text-sm font-medium text-[#FE5720] hover:underline"
                                >
                                    View
                                </Link>
                            </div>
                        )}
                    />

                    {/* ========================================================== */}
                    {/* Stock Information Note                                     */}
                    {/* ========================================================== */}

                    <div className="mt-3 flex items-start gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5">
                        <Info
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-700"
                            strokeWidth={1.8}
                        />

                        <p className="text-[11px] leading-4 text-gray-700">
                            On-hand changes only
                            through Stock Receipt
                            (adds) and Parts
                            Requests fulfillment
                            (deducts) — nothing
                            here is edited
                            directly. Low Stock
                            is a flag only;
                            reordering is a
                            manual step in
                            Finance.
                        </p>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}