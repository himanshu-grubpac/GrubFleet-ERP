"use client";

import { useParams, useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type StockLevelStatus = "in-stock" | "low-stock";

type StockLocation = {
    location: string;
    quantity: number;
};

type StockLevel = {
    id: string;
    partName: string;
    partNumber: string;
    compatibleClass: string;
    unit: string;
    threshold: number;
    totalOnHand: number;
    status: StockLevelStatus;
    locations: StockLocation[];
};

/* -------------------------------------------------------------------------- */
/* Mock Stock Levels                                                          */
/* -------------------------------------------------------------------------- */

const MOCK_STOCK_LEVELS: StockLevel[] = [
    {
        id: "stock-001",
        partName: "Brake Pad Set (Front+Rear)",
        partNumber: "PRT-10018",
        compatibleClass: "Both classes",
        unit: "Set",
        threshold: 15,
        totalOnHand: 42,
        status: "in-stock",
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
    },

    {
        id: "stock-002",
        partName: "Tyre — 3.00-10",
        partNumber: "PRT-10007",
        compatibleClass: "Both classes",
        unit: "Each",
        threshold: 20,
        totalOnHand: 74,
        status: "in-stock",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 34,
            },
            {
                location: "Malad Workshop",
                quantity: 22,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 18,
            },
        ],
    },

    {
        id: "stock-003",
        partName: "Chain Sprocket Kit",
        partNumber: "PRT-10025",
        compatibleClass: "Petrol Scooter — Standard",
        unit: "Kit",
        threshold: 10,
        totalOnHand: 6,
        status: "low-stock",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 6,
            },
        ],
    },

    {
        id: "stock-004",
        partName: "Air Filter",
        partNumber: "PRT-10033",
        compatibleClass: "Both classes",
        unit: "Each",
        threshold: 20,
        totalOnHand: 70,
        status: "in-stock",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 40,
            },
            {
                location: "Taloja Warehouse",
                quantity: 30,
            },
        ],
    },

    {
        id: "stock-005",
        partName: "Spark Plug",
        partNumber: "PRT-10041",
        compatibleClass: "Both classes",
        unit: "Each",
        threshold: 25,
        totalOnHand: 100,
        status: "in-stock",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 60,
            },
            {
                location: "Malad Workshop",
                quantity: 25,
            },
            {
                location: "Thane Workshop",
                quantity: 15,
            },
        ],
    },

    {
        id: "stock-006",
        partName: "Clutch Plate Set",
        partNumber: "PRT-10052",
        compatibleClass: "Petrol Auto — Cargo",
        unit: "Set",
        threshold: 10,
        totalOnHand: 8,
        status: "low-stock",
        locations: [
            {
                location: "Malad Workshop",
                quantity: 8,
            },
        ],
    },

    {
        id: "stock-007",
        partName: "Headlamp Assembly",
        partNumber: "PRT-10063",
        compatibleClass: "Both classes",
        unit: "Each",
        threshold: 12,
        totalOnHand: 30,
        status: "in-stock",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 18,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 12,
            },
        ],
    },

    {
        id: "stock-008",
        partName: "Cargo Box Hinge Kit",
        partNumber: "PRT-10091",
        compatibleClass: "Petrol Auto — Cargo",
        unit: "Kit",
        threshold: 8,
        totalOnHand: 14,
        status: "in-stock",
        locations: [
            {
                location: "Malad Workshop",
                quantity: 14,
            },
        ],
    },

    {
        id: "stock-009",
        partName: "Engine Oil (1L)",
        partNumber: "PRT-10102",
        compatibleClass: "Both classes",
        unit: "Litre",
        threshold: 40,
        totalOnHand: 240,
        status: "in-stock",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 84,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 96,
            },
            {
                location: "Taloja Warehouse",
                quantity: 60,
            },
        ],
    },

    {
        id: "stock-010",
        partName: "Rear Shock Absorber",
        partNumber: "PRT-10114",
        compatibleClass: "Petrol Scooter — Standard",
        unit: "Each",
        threshold: 10,
        totalOnHand: 22,
        status: "in-stock",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 16,
            },
            {
                location: "Thane Workshop",
                quantity: 6,
            },
        ],
    },

    {
        id: "stock-011",
        partName: "Clutch Cable",
        partNumber: "PRT-10121",
        compatibleClass: "Petrol Scooter — Standard",
        unit: "Each",
        threshold: 10,
        totalOnHand: 12,
        status: "in-stock",
        locations: [
            {
                location: "Bhandup Workshop",
                quantity: 12,
            },
        ],
    },

    {
        id: "stock-012",
        partName: "Brake Shoe Set",
        partNumber: "PRT-10132",
        compatibleClass: "Petrol Auto — Cargo",
        unit: "Set",
        threshold: 15,
        totalOnHand: 11,
        status: "low-stock",
        locations: [
            {
                location: "Petrol Auto Workshop",
                quantity: 11,
            },
        ],
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getStatusLabel = (
    status: StockLevelStatus,
) => {
    switch (status) {
        case "in-stock":
            return "In Stock";

        case "low-stock":
            return "Low Stock";

        default:
            return status;
    }
};

const getStatusClass = (
    status: StockLevelStatus,
) => {
    switch (status) {
        case "in-stock":
            return "bg-green-50 text-green-700";

        case "low-stock":
            return "bg-orange-50 text-orange-700";

        default:
            return "bg-gray-100 text-gray-500";
    }
};

const getUnitLabel = (
    quantity: number,
    unit: string,
) => {
    if (unit === "Each") {
        return `${quantity} each`;
    }

    if (unit === "Litre") {
        return `${quantity} litre${quantity === 1 ? "" : "s"}`;
    }

    if (unit === "Set") {
        return `${quantity} set${quantity === 1 ? "" : "s"}`;
    }

    if (unit === "Kit") {
        return `${quantity} kit${quantity === 1 ? "" : "s"}`;
    }

    return `${quantity} ${unit.toLowerCase()}${quantity === 1 ? "" : "s"}`;
};

/* -------------------------------------------------------------------------- */
/* Info Row                                                                   */
/* -------------------------------------------------------------------------- */

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex min-h-[27px] items-center border-b border-gray-100 px-3 last:border-b-0">
            <p className="w-1/2 text-[10px] font-medium text-gray-400">
                {label}
            </p>

            <p className="w-1/2 text-right text-[10px] font-medium text-gray-800">
                {value}
            </p>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StockLevelsViewPage() {
    const params = useParams();
    const router = useRouter();

    const stockId = String(params.id);

    const stock = MOCK_STOCK_LEVELS.find(
        (item) => item.id === stockId,
    );

    /* ---------------------------------------------------------------------- */
    /* Back                                                                     */
    /* ---------------------------------------------------------------------- */

    const handleBack = () => {
        router.push("/inventory/Stock-levels");
    };

    /* ---------------------------------------------------------------------- */
    /* Not Found                                                                */
    /* ---------------------------------------------------------------------- */

    if (!stock) {
        return (
            <div className="min-h-full bg-gray-50">
                <div className="px-5 py-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <p className="text-sm text-gray-500">
                            Stock level not found.
                        </p>

                        <button
                            type="button"
                            onClick={handleBack}
                            className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
                        >
                            Back to Stock Levels
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isLowStock =
        stock.totalOnHand <= stock.threshold;

    const currentStatus: StockLevelStatus =
        isLowStock
            ? "low-stock"
            : "in-stock";

    /* ---------------------------------------------------------------------- */
    /* UI                                                                       */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">

                {/* ========================================================== */}
                {/* Header                                                       */}
                {/* ========================================================== */}

                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {stock.partName}
                            </h1>

                            <span
                                className={[
                                    "rounded-full px-2 py-0.5",
                                    "text-[10px] font-medium",
                                    getStatusClass(
                                        currentStatus,
                                    ),
                                ].join(" ")}
                            >
                                {getStatusLabel(
                                    currentStatus,
                                )}
                            </span>
                        </div>

                        <p className="mt-0.5 text-[10px] text-gray-500">
                            {stock.partNumber}
                        </p>
                    </div>

                    {/* ====================================================== */}
                    {/* Actions                                                  */}
                    {/* ====================================================== */}

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="neutral"
                            onClick={() =>
                                router.push(
                                    `/inventory/Stock-register/${stock.id}`,
                                )
                            }
                            className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                        >
                            View Part
                        </Button>
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Stock Information                                           */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Stock Information
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                        <InfoRow
                            label="Part number"
                            value={stock.partNumber}
                        />

                        <InfoRow
                            label="Compatible class"
                            value={stock.compatibleClass}
                        />

                        <InfoRow
                            label="Unit of measure"
                            value={stock.unit}
                        />

                        <InfoRow
                            label="Threshold"
                            value={getUnitLabel(
                                stock.threshold,
                                stock.unit,
                            )}
                        />

                    </div>
                </section>

                {/* ========================================================== */}
                {/* Stock Summary                                                */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="text-sm font-semibold text-gray-900">
                        Stock
                    </h2>

                    <p className="mb-3 mt-0.5 text-[10px] text-gray-500">
                        Current on-hand quantity across all
                        locations.
                    </p>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                        <InfoRow
                            label="On-hand (all locations)"
                            value={getUnitLabel(
                                stock.totalOnHand,
                                stock.unit,
                            )}
                        />

                        <InfoRow
                            label="Low stock threshold"
                            value={getUnitLabel(
                                stock.threshold,
                                stock.unit,
                            )}
                        />

                    </div>
                </section>

                {/* ========================================================== */}
                {/* Stock by Location                                            */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Stock by Location
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                        {stock.locations.map(
                            (location) => (
                                <InfoRow
                                    key={
                                        location.location
                                    }
                                    label={
                                        location.location
                                    }
                                    value={getUnitLabel(
                                        location.quantity,
                                        stock.unit,
                                    )}
                                />
                            ),
                        )}

                    </div>
                </section>

                {/* ========================================================== */}
                {/* Footer Information                                           */}
                {/* ========================================================== */}

                <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-xs font-semibold text-blue-700">
                            i
                        </span>

                        <p className="text-[10px] leading-4 text-blue-700">
                            On-hand changes only through Stock
                            Receipt (adds) and Parts Requests
                            fulfillment (deducts) — nothing here is
                            edited directly. Low Stock is a flag
                            only; reordering is a manual step in
                            Finance.
                        </p>
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Footer                                                       */}
                {/* ========================================================== */}

                <div className="mt-2 border-t border-gray-200 pt-2">
                    <p className="text-[8px] leading-3 text-gray-400">
                        View only · Inventory &amp; Stock
                        Management module. Stock quantities are
                        managed through Stock Receipt and Parts
                        Request fulfillment.
                    </p>
                </div>

            </div>
        </div>
    );
}