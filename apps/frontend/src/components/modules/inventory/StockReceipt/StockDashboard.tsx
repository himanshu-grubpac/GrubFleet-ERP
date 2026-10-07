"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, PackagePlus } from "lucide-react";
import { useRouter } from "next/navigation";

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

type StockReceipt = {
    id: string;
    date: string;
    part: string;
    partNumber: string;
    quantity: number;
    unitCost: number;
    location: string;
    purchaseInvoice: string;
    supplier: string;
    consumed: boolean;
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_STOCK_RECEIPTS: StockReceipt[] = [
    {
        id: "receipt-001",
        date: "12-Sep-2026",
        part: "Brake Pad Set (Front+Rear)",
        partNumber: "PRT-10018",
        quantity: 14,
        unitCost: 340,
        location: "Bhiwandi Warehouse",
        purchaseInvoice: "PINV-2026-0156",
        supplier: "Vertex Auto Components",
        consumed: true,
    },
    {
        id: "receipt-002",
        date: "05-Sep-2026",
        part: "Tyre — 3.00-10",
        partNumber: "PRT-10007",
        quantity: 18,
        unitCost: 950,
        location: "Bhiwandi Warehouse",
        purchaseInvoice: "PINV-2026-0149",
        supplier: "Silverline Tyres & Rubber Co",
        consumed: true,
    },
    {
        id: "receipt-003",
        date: "28-Aug-2026",
        part: "Chain Sprocket Kit",
        partNumber: "PRT-10025",
        quantity: 6,
        unitCost: 610,
        location: "Bhandup Workshop",
        purchaseInvoice: "PINV-2026-0138",
        supplier: "Vertex Auto Components",
        consumed: true,
    },
    {
        id: "receipt-004",
        date: "24-Aug-2026",
        part: "Air Filter",
        partNumber: "PRT-10033",
        quantity: 30,
        unitCost: 180,
        location: "Taloja Warehouse",
        purchaseInvoice: "PINV-2026-0163",
        supplier: "Vertex Auto Components",
        consumed: true,
    },
    {
        id: "receipt-005",
        date: "20-Aug-2026",
        part: "Engine Oil (1L)",
        partNumber: "PRT-10102",
        quantity: 96,
        unitCost: 210,
        location: "Bhiwandi Warehouse",
        purchaseInvoice: "PINV-2026-0171",
        supplier: "Greenline EV Parts Co",
        consumed: true,
    },
    {
        id: "receipt-006",
        date: "15-Aug-2026",
        part: "Spark Plug",
        partNumber: "PRT-10041",
        quantity: 40,
        unitCost: 90,
        location: "Bhandup Workshop",
        purchaseInvoice: "PINV-2026-0144",
        supplier: "Vertex Auto Components",
        consumed: true,
    },
    {
        id: "receipt-007",
        date: "09-Aug-2026",
        part: "Battery (12V Lead-Acid)",
        partNumber: "PRT-10128",
        quantity: 9,
        unitCost: 2450,
        location: "Bhiwandi Warehouse",
        purchaseInvoice: "PINV-2026-0129",
        supplier: "Bluepeak Battery Systems",
        consumed: true,
    },
    {
        id: "receipt-008",
        date: "02-Aug-2026",
        part: "Headlamp Assembly",
        partNumber: "PRT-10063",
        quantity: 18,
        unitCost: 520,
        location: "Bhandup Workshop",
        purchaseInvoice: "PINV-2026-0121",
        supplier: "Vertex Auto Components",
        consumed: true,
    },
    {
        id: "receipt-009",
        date: "27-Jul-2026",
        part: "Clutch Plate Set",
        partNumber: "PRT-10052",
        quantity: 8,
        unitCost: 780,
        location: "Malad Workshop",
        purchaseInvoice: "PINV-2026-0115",
        supplier: "Vertex Auto Components",
        consumed: false,
    },
    {
        id: "receipt-010",
        date: "21-Jul-2026",
        part: "Cargo Box Hinge Kit",
        partNumber: "PRT-10091",
        quantity: 14,
        unitCost: 260,
        location: "Malad Workshop",
        purchaseInvoice: "PINV-2026-0108",
        supplier: "Anchor Logistics Supplies",
        consumed: false,
    },
    {
        id: "receipt-011",
        date: "16-Jul-2026",
        part: "Brake Shoe Set",
        partNumber: "PRT-10132",
        quantity: 12,
        unitCost: 310,
        location: "Thane Workshop",
        purchaseInvoice: "PINV-2026-0097",
        supplier: "Vertex Auto Components",
        consumed: false,
    },
    {
        id: "receipt-012",
        date: "10-Jul-2026",
        part: "Clutch Cable",
        partNumber: "PRT-10121",
        quantity: 20,
        unitCost: 140,
        location: "Bhandup Workshop",
        purchaseInvoice: "PINV-2026-0089",
        supplier: "Anchor Logistics Supplies",
        consumed: false,
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatCurrency = (value: number) =>
    `Rs. ${value.toLocaleString("en-IN")}`;

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StockReceiptDashboardPage() {
    const router = useRouter();

    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [stockReceipts, setStockReceipts] =
        useState<StockReceipt[]>(MOCK_STOCK_RECEIPTS);

    const [search, setSearch] = useState("");

    const [filters, setFilters] = useState<
        Record<string, string>
    >({
        location: "",
    });

    const [currentPage, setCurrentPage] = useState(1);

    /* ---------------------------------------------------------------------- */
    /* Filter Options                                                          */
    /* ---------------------------------------------------------------------- */

    const locationOptions = useMemo(() => {
        const locations = Array.from(
            new Set(
                stockReceipts.map(
                    (receipt) => receipt.location,
                ),
            ),
        );

        return locations.map((location) => ({
            label: location,
            value: location,
        }));
    }, [stockReceipts]);

    /* ---------------------------------------------------------------------- */
    /* Filter Data                                                             */
    /* ---------------------------------------------------------------------- */

    const filteredStockReceipts = useMemo(() => {
        const searchValue = search
            .trim()
            .toLowerCase();

        return stockReceipts.filter((receipt) => {
            const matchesSearch =
                !searchValue ||
                receipt.part
                    .toLowerCase()
                    .includes(searchValue) ||
                receipt.partNumber
                    .toLowerCase()
                    .includes(searchValue) ||
                receipt.purchaseInvoice
                    .toLowerCase()
                    .includes(searchValue);

            const matchesLocation =
                !filters.location ||
                receipt.location === filters.location;

            return (
                matchesSearch &&
                matchesLocation
            );
        });
    }, [stockReceipts, search, filters]);

    /* ---------------------------------------------------------------------- */
    /* Reset Pagination When Search / Filters Change                          */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filters]);

    /* ---------------------------------------------------------------------- */
    /* Pagination                                                              */
    /* ---------------------------------------------------------------------- */

    const totalItems =
        filteredStockReceipts.length;

    const totalPages = Math.max(
        1,
        Math.ceil(
            totalItems / PAGE_SIZE,
        ),
    );

    const paginatedStockReceipts = useMemo(() => {
        const startIndex =
            (currentPage - 1) * PAGE_SIZE;

        const endIndex =
            startIndex + PAGE_SIZE;

        return filteredStockReceipts.slice(
            startIndex,
            endIndex,
        );
    }, [
        filteredStockReceipts,
        currentPage,
    ]);

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                              */
    /* ---------------------------------------------------------------------- */

    const handleAddStock = () => {
        router.push(
            "/inventory/stock-receipt/create",
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Clear Filters                                                           */
    /* ---------------------------------------------------------------------- */

    const handleClearFilters = () => {
        setSearch("");

        setFilters({
            location: "",
        });

        setCurrentPage(1);
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                           */
    /* ---------------------------------------------------------------------- */

    const receiptColumns = [
        {
            key: "date",
            label: "DATE",
            render: (receipt: StockReceipt) => (
                <span className="text-xs font-medium text-gray-700">
                    {receipt.date}
                </span>
            ),
        },

        {
            key: "part",
            label: "PART",
            render: (receipt: StockReceipt) => (
                <span className="text-xs font-semibold text-gray-900">
                    {receipt.part}
                </span>
            ),
        },

        {
            key: "partNumber",
            label: "PART NO.",
            render: (receipt: StockReceipt) => (
                <span className="text-xs font-medium text-gray-700">
                    {receipt.partNumber}
                </span>
            ),
        },

        {
            key: "quantity",
            label: "QTY",
            render: (receipt: StockReceipt) => (
                <span className="text-xs text-gray-700">
                    {receipt.quantity}
                </span>
            ),
        },

        {
            key: "unitCost",
            label: "UNIT COST",
            render: (receipt: StockReceipt) => (
                <span className="text-xs text-gray-700">
                    {formatCurrency(
                        receipt.unitCost,
                    )}
                </span>
            ),
        },

        {
            key: "location",
            label: "LOCATION",
            render: (receipt: StockReceipt) => (
                <span className="text-xs text-gray-600">
                    {receipt.location}
                </span>
            ),
        },

        {
            key: "purchaseInvoice",
            label: "PURCHASE INVOICE",
            render: (receipt: StockReceipt) => (
                <span className="text-xs text-gray-600">
                    {receipt.purchaseInvoice} —{" "}
                    {receipt.supplier}
                </span>
            ),
        },
    ];

    /* ---------------------------------------------------------------------- */
    /* Render                                                                  */
    /* ---------------------------------------------------------------------- */

    return (
        <DashboardLayout
            title="Stock Receipt"
            description="Every batch of stock received against a Purchase invoice."
            action={
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleAddStock}
                    >
                        + Add Stock
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
                searchPlaceholder="Search by part name or invoice number"
                onSearchChange={setSearch}
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
                onClear={handleClearFilters}
            />

            {/* ================================================================== */}
            {/* Empty State                                                        */}
            {/* ================================================================== */}

            {filteredStockReceipts.length ===
                0 ? (
                <DashboardEmptyState
                    icon={
                        <PackagePlus
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No stock receipts found"
                    description="Try changing your search or filters."
                    buttonLabel="Clear filters"
                    onButtonClick={
                        handleClearFilters
                    }
                />
            ) : (
                <>
                    {/* ========================================================== */}
                    {/* Stock Receipt Table                                        */}
                    {/* ========================================================== */}

                    <DashboardTable
                        columns={receiptColumns}
                        data={
                            paginatedStockReceipts
                        }
                        getRowKey={(receipt) =>
                            receipt.id
                        }
                        renderActions={(receipt) => (
                            <DashboardTableActions
                                status="active"
                                locationId={receipt.id}
                                viewHref={`/inventory/stock-receipt/${receipt.id}`}
                                onEdit={() => { }}
                                onToggleStatus={() => { }}
                            />
                        )}
                    />

                    {/* ========================================================== */}
                    {/* Information Note                                           */}
                    {/* ========================================================== */}

                    <div className="mt-3 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <Info
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500"
                            strokeWidth={1.8}
                        />

                        <p className="text-[11px] leading-4 text-gray-700">
                            Remove is only available
                            while none of that batch has
                            been drawn yet by a Parts
                            Request — once any of it has
                            been consumed, correct a
                            mistake with a fresh,
                            offsetting entry instead.
                        </p>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}