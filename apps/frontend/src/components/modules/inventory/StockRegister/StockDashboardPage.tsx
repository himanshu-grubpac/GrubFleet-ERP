"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type StockPart = {
    id: string;
    partName: string;
    partNumber: string;
    compatibleClass: string;
    unit: string;
    threshold: string;
    status: "active" | "inactive";
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_STOCK_PARTS: StockPart[] = [
    {
        id: "stock-001",
        partName: "Brake Pad Set (Front+Rear)",
        partNumber: "PRT-10018",
        compatibleClass: "Both classes",
        unit: "Set",
        threshold: "15",
        status: "active",
    },
    {
        id: "stock-002",
        partName: "Tyre — 3.00-10",
        partNumber: "PRT-10007",
        compatibleClass: "Both classes",
        unit: "Each",
        threshold: "10",
        status: "active",
    },
    {
        id: "stock-003",
        partName: "Chain Sprocket Kit",
        partNumber: "PRT-10025",
        compatibleClass: "Petrol Scooter — Standard",
        unit: "Kit",
        threshold: "12",
        status: "active",
    },
    {
        id: "stock-004",
        partName: "Air Filter",
        partNumber: "PRT-10033",
        compatibleClass: "Both classes",
        unit: "Each",
        threshold: "10",
        status: "active",
    },
    {
        id: "stock-005",
        partName: "Spark Plug",
        partNumber: "PRT-10041",
        compatibleClass: "Both classes",
        unit: "Each",
        threshold: "20",
        status: "active",
    },
    {
        id: "stock-006",
        partName: "Clutch Plate Set",
        partNumber: "PRT-10052",
        compatibleClass: "Petrol Auto — Cargo",
        unit: "Set",
        threshold: "15",
        status: "active",
    },
    {
        id: "stock-007",
        partName: "Headlamp Assembly",
        partNumber: "PRT-10063",
        compatibleClass: "Both classes",
        unit: "Each",
        threshold: "8",
        status: "active",
    },
    {
        id: "stock-008",
        partName: "Cargo Box Hinge Kit",
        partNumber: "PRT-10091",
        compatibleClass: "Petrol Auto — Cargo",
        unit: "Kit",
        threshold: "10",
        status: "active",
    },
    {
        id: "stock-009",
        partName: "Engine Oil (1L)",
        partNumber: "PRT-10102",
        compatibleClass: "Both classes",
        unit: "Litre",
        threshold: "25",
        status: "active",
    },
    {
        id: "stock-010",
        partName: "Rear Shock Absorber",
        partNumber: "PRT-10114",
        compatibleClass: "Petrol Scooter — Standard",
        unit: "Each",
        threshold: "6",
        status: "active",
    },
    {
        id: "stock-011",
        partName: "Clutch Cable",
        partNumber: "PRT-10121",
        compatibleClass: "Petrol Scooter — Standard",
        unit: "Each",
        threshold: "10",
        status: "active",
    },
    {
        id: "stock-012",
        partName: "Brake Shoe Set",
        partNumber: "PRT-10132",
        compatibleClass: "Petrol Auto — Cargo",
        unit: "Set",
        threshold: "15",
        status: "active",
    },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StockDashboardPage() {
    const router = useRouter();

    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [stockParts, setStockParts] =
        useState<StockPart[]>(MOCK_STOCK_PARTS);

    const [search, setSearch] = useState("");

    const [filters, setFilters] = useState<Record<string, string>>({
        compatibleClass: "",
        unit: "",
    });

    const [currentPage, setCurrentPage] = useState(1);

    /* ---------------------------------------------------------------------- */
    /* Filter Data                                                             */
    /* ---------------------------------------------------------------------- */

    const filteredStockParts = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return stockParts.filter((part) => {
            const matchesSearch =
                !searchValue ||
                part.partName
                    .toLowerCase()
                    .includes(searchValue) ||
                part.partNumber
                    .toLowerCase()
                    .includes(searchValue) ||
                part.compatibleClass
                    .toLowerCase()
                    .includes(searchValue);

            const matchesCompatibleClass =
                !filters.compatibleClass ||
                part.compatibleClass ===
                filters.compatibleClass;



            return (
                matchesSearch &&
                matchesCompatibleClass

            );
        });
    }, [search, filters, stockParts]);

    /* ---------------------------------------------------------------------- */
    /* Reset Pagination When Search / Filters Change                          */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filters]);

    /* ---------------------------------------------------------------------- */
    /* Pagination                                                              */
    /* ---------------------------------------------------------------------- */

    const totalItems = filteredStockParts.length;

    const totalPages = Math.max(
        1,
        Math.ceil(totalItems / PAGE_SIZE),
    );

    const paginatedStockParts = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;

        return filteredStockParts.slice(
            startIndex,
            endIndex,
        );
    }, [filteredStockParts, currentPage]);

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                              */
    /* ---------------------------------------------------------------------- */

    const handleAddPart = () => {
        router.push("/inventory/Stock-register/create");
    };

    const handleEditPart = (part: StockPart) => {
        router.push(
            `/inventory/Stock-register/${part.id}/edit`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Status                                                                  */
    /* ---------------------------------------------------------------------- */

    const handleToggleStatus = (part: StockPart) => {
        setStockParts((previous) =>
            previous.map((item) =>
                item.id === part.id
                    ? {
                        ...item,
                        status:
                            item.status === "active"
                                ? "inactive"
                                : "active",
                    }
                    : item,
            ),
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Clear Filters                                                           */
    /* ---------------------------------------------------------------------- */

    const handleClearFilters = () => {
        setSearch("");

        setFilters({
            compatibleClass: "",
            unit: "",
        });

        setCurrentPage(1);
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                           */
    /* ---------------------------------------------------------------------- */

    const stockColumns = [
        {
            key: "partName",
            label: "PART",
            render: (part: StockPart) => (
                <div>
                    <p className="font-medium text-gray-900">
                        {part.partName}
                    </p>
                </div>
            ),
        },

        {
            key: "partNumber",
            label: "PART NO.",
            render: (part: StockPart) => (
                <span className="text-sm font-medium text-gray-600">
                    {part.partNumber}
                </span>
            ),
        },

        {
            key: "compatibleClass",
            label: "COMPATIBLE CLASS",
            render: (part: StockPart) => (
                <span className="text-sm text-gray-600">
                    {part.compatibleClass}
                </span>
            ),
        },

        {
            key: "threshold",
            label: "THRESHOLD",
            render: (part: StockPart) => (
                <span className="text-sm text-gray-600">
                    {part.threshold}
                </span>
            ),
        },

        {
            key: "unit",
            label: "UNIT",
            render: (part: StockPart) => (
                <span className="text-sm text-gray-600">
                    {part.unit}
                </span>
            ),
        },


    ];

    /* ---------------------------------------------------------------------- */
    /* Render                                                                  */
    /* ---------------------------------------------------------------------- */

    return (
        <DashboardLayout
            title="Stock Register"
            description="Every spare part master record, across compatible asset classes."
            action={
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleAddPart}
                    >
                        + Add Part
                    </Button>
                </div>
            }
            pagination={{
                currentPage,
                totalPages,
                totalItems,
                pageSize: PAGE_SIZE,
                onPageChange: setCurrentPage,
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
                        key: "compatibleClass",
                        label: "Compatible Class",
                        options: [
                            {
                                label: "Both classes",
                                value: "Both classes",
                            },
                            {
                                label:
                                    "Petrol Scooter — Standard",
                                value:
                                    "Petrol Scooter — Standard",
                            },
                            {
                                label:
                                    "Petrol Auto — Cargo",
                                value:
                                    "Petrol Auto — Cargo",
                            },
                        ],
                    },

                ]}
                filterValues={filters}
                onFilterChange={(key, value) => {
                    setFilters((previous) => ({
                        ...previous,
                        [key]: value,
                    }));
                }}
                onClear={handleClearFilters}
            />

            {/* ================================================================== */}
            {/* Empty State                                                        */}
            {/* ================================================================== */}

            {filteredStockParts.length === 0 ? (
                <DashboardEmptyState
                    icon={
                        <PackageSearch
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title={
                        stockParts.length === 0
                            ? "No stock parts added yet"
                            : "No stock parts found"
                    }
                    description={
                        stockParts.length === 0
                            ? "Add your first spare part to the stock register."
                            : "Try changing your search or filters."
                    }
                    buttonLabel={
                        stockParts.length === 0
                            ? "Add Part"
                            : "Clear filters"
                    }
                    onButtonClick={() => {
                        if (stockParts.length === 0) {
                            handleAddPart();
                            return;
                        }

                        handleClearFilters();
                    }}
                />
            ) : (
                <DashboardTable
                    columns={stockColumns}
                    data={paginatedStockParts}
                    getRowKey={(part) => part.id}
                    renderActions={(part) => (
                        <DashboardTableActions
                            status={part.status}
                            locationId={part.id}
                            viewHref={`/inventory/Stock-register/${part.id}`}
                            onEdit={() =>
                                handleEditPart(part)
                            }
                            onToggleStatus={() =>
                                handleToggleStatus(part)
                            }
                        />
                    )}
                />
            )}
        </DashboardLayout>
    );
}