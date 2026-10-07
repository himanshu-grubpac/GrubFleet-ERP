"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type StockStatus = "active" | "inactive";

type StockLocation = {
    location: string;
    quantity: number;
};

type WorkOrderUsage = {
    workOrder: string;
    date: string;
    quantity: number;
    type: string;
    vehicle: string;
};

type StockRecord = {
    id: string;

    partName: string;
    partNumber: string;

    status: StockStatus;

    compatibleAssetClasses: string[];

    unitOfMeasure: string;

    retailMarkup: string;
    wholesaleMarkup: string;

    threshold: string;

    onHand: number;

    locationStock: StockLocation[];

    workOrderHistory: WorkOrderUsage[];
};

/* -------------------------------------------------------------------------- */
/* Mock Stock Records                                                         */
/* -------------------------------------------------------------------------- */

const MOCK_STOCK_RECORDS: StockRecord[] = [
    {
        id: "stock-001",

        partName: "Brake Pad Set (Front+Rear)",

        partNumber: "PRT-10018",

        status: "active",

        compatibleAssetClasses: [
            "Petrol Scooter — Standard",
            "Petrol Auto — Cargo",
        ],

        unitOfMeasure: "Set",

        retailMarkup: "20",

        wholesaleMarkup: "10",

        threshold: "15",

        onHand: 42,

        locationStock: [
            {
                location: "Bhandup Workshop",
                quantity: 28,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 14,
            },
        ],

        workOrderHistory: [
            {
                workOrder: "WO-2026-1142",
                date: "20-Sep-2026",
                quantity: 1,
                type: "Internal",
                vehicle: "VH-1006",
            },
            {
                workOrder: "WO-2026-1098",
                date: "02-Sep-2026",
                quantity: 1,
                type: "External",
                vehicle: "VH-2004",
            },
            {
                workOrder: "WO-2026-1054",
                date: "18-Aug-2026",
                quantity: 2,
                type: "Internal",
                vehicle: "VH-1007",
            },
            {
                workOrder: "WO-2026-0987",
                date: "27-Jul-2026",
                quantity: 1,
                type: "External",
                vehicle: "VH-1003",
            },
        ],
    },

    {
        id: "stock-002",

        partName: "Fuel Filter",

        partNumber: "PRT-10019",

        status: "active",

        compatibleAssetClasses: [
            "Petrol Scooter — Standard",
        ],

        unitOfMeasure: "Each",

        retailMarkup: "20",

        wholesaleMarkup: "10",

        threshold: "10",

        onHand: 24,

        locationStock: [
            {
                location: "Bhandup Workshop",
                quantity: 15,
            },
            {
                location: "Bhiwandi Warehouse",
                quantity: 9,
            },
        ],

        workOrderHistory: [
            {
                workOrder: "WO-2026-1140",
                date: "19-Sep-2026",
                quantity: 1,
                type: "Internal",
                vehicle: "VH-1004",
            },
            {
                workOrder: "WO-2026-1084",
                date: "30-Aug-2026",
                quantity: 2,
                type: "External",
                vehicle: "VH-2002",
            },
        ],
    },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StockViewPage() {
    const params = useParams();
    const router = useRouter();

    const stockId = String(params.id);

    const [stock, setStock] = useState<StockRecord>(
        MOCK_STOCK_RECORDS.find(
            (item) => item.id === stockId,
        ) ?? MOCK_STOCK_RECORDS[0],
    );

    /* ---------------------------------------------------------------------- */
    /* Deactivate Modal                                                       */
    /* ---------------------------------------------------------------------- */

    const [showDeactivateModal, setShowDeactivateModal] =
        useState(false);

    const [deactivateReason, setDeactivateReason] =
        useState("");

    const [deactivateReasonError, setDeactivateReasonError] =
        useState("");

    /* ---------------------------------------------------------------------- */
    /* Edit                                                                   */
    /* ---------------------------------------------------------------------- */

    const handleEdit = () => {
        router.push(
            `/inventory/Stock-register/${stock.id}/edit`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Deactivate                                                            */
    /* ---------------------------------------------------------------------- */

    const handleDeactivate = () => {
        const reason = deactivateReason.trim();

        if (!reason) {
            setDeactivateReasonError(
                "Reason is required.",
            );
            return;
        }

        setStock((previous) => ({
            ...previous,
            status: "inactive",
        }));

        console.log("Part deactivated:", {
            partId: stock.id,
            reason,
        });

        setShowDeactivateModal(false);
        setDeactivateReason("");
        setDeactivateReasonError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Cancel Deactivate                                                     */
    /* ---------------------------------------------------------------------- */

    const handleCancelDeactivate = () => {
        setShowDeactivateModal(false);
        setDeactivateReason("");
        setDeactivateReasonError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Activate                                                               */
    /* ---------------------------------------------------------------------- */

    const handleActivate = () => {
        setStock((previous) => ({
            ...previous,
            status: "active",
        }));

        console.log(
            "Part activated:",
            stock.id,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Compatible Classes                                                     */
    /* ---------------------------------------------------------------------- */

    const compatibleClass =
        stock.compatibleAssetClasses.length === 0
            ? "—"
            : stock.compatibleAssetClasses.length === 1
                ? stock.compatibleAssetClasses[0]
                : "Both classes";

    /* ---------------------------------------------------------------------- */
    /* Threshold Unit                                                         */
    /* ---------------------------------------------------------------------- */

    /*
     * The Add Part form stores the threshold as a number and
     * the Unit of measure as the unit.
     *
     * Therefore the Threshold unit displayed in Master Record
     * comes from the same Unit of measure.
     *
     * Example:
     * Unit of measure = Set
     * Threshold = 15
     *
     * Master Record:
     * Threshold unit = Set
     *
     * Stock:
     * Low stock threshold = 15 sets
     */


    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">
                {/* ========================================================== */}
                {/* HEADER                                                       */}
                {/* ========================================================== */}

                <div className="mb-4 flex items-start justify-between">
                    {/* Part Name + Status */}

                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {stock.partName}
                            </h1>

                            {stock.status ===
                                "active" ? (
                                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                                    Active
                                </span>
                            ) : (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                    Inactive
                                </span>
                            )}
                        </div>

                        <p className="mt-0.5 text-[10px] text-gray-500">
                            {stock.partNumber}
                            {" — "}
                            compatible with{" "}
                            {stock.compatibleAssetClasses.length >
                                1
                                ? "both classes"
                                : "one class"}
                            .
                        </p>
                    </div>

                    {/* ====================================================== */}
                    {/* ACTIONS                                                  */}
                    {/* ====================================================== */}

                    <div className="flex items-center gap-2">
                        {/* Edit */}

                        <Button
                            type="button"
                            variant="neutral"
                            onClick={handleEdit}
                            className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                        >
                            Edit
                        </Button>

                        {/* Deactivate / Activate */}

                        {stock.status === "active" ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={() => {
                                    setDeactivateReason(
                                        "",
                                    );

                                    setDeactivateReasonError(
                                        "",
                                    );

                                    setShowDeactivateModal(
                                        true,
                                    );
                                }}
                                className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                            >
                                Deactivate
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleActivate}
                                className="h-9 border-[#FE5720] bg-white px-5 text-[#FE5720] hover:bg-orange-50"
                            >
                                Activate
                            </Button>
                        )}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* MASTER RECORD                                                */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Master record
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {/* Part Number */}

                        <InfoRow
                            label="Part number"
                            value={stock.partNumber}
                        />

                        {/* Compatible Class */}

                        <InfoRow
                            label="Compatible class"
                            value={compatibleClass}
                        />

                        {/* Unit of Measure */}

                        <InfoRow
                            label="Unit of measure"
                            value={stock.unitOfMeasure}
                        />

                        {/* Threshold Unit */}


                    </div>
                </section>

                {/* ========================================================== */}
                {/* PRICING                                                      */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Pricing
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {/* Retail Markup */}

                        <InfoRow
                            label="Retail markup"
                            value={`${stock.retailMarkup}%`}
                        />

                        {/* Wholesale Markup */}

                        <InfoRow
                            label="Wholesale markup"
                            value={`${stock.wholesaleMarkup}%`}
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* STOCK                                                        */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Stock
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {/* On Hand */}

                        <InfoRow
                            label="On-hand (all locations)"
                            value={`${stock.onHand} ${getPluralizedUnit(
                                stock.unitOfMeasure,
                                stock.onHand,
                            )}`}
                        />

                        {/* Low Stock Threshold */}

                        <InfoRow
                            label="Low stock threshold"
                            value={`${stock.threshold} ${getPluralizedUnit(
                                stock.unitOfMeasure,
                                Number(stock.threshold),
                            )}`}
                        />

                        {/* Location Stock */}

                        {stock.locationStock.map(
                            (location) => (
                                <InfoRow
                                    key={location.location}
                                    label={location.location}
                                    value={`${location.quantity} ${getPluralizedUnit(
                                        stock.unitOfMeasure,
                                        location.quantity,
                                    )}`}
                                />
                            ),
                        )}
                    </div>
                </section>

                {/* ========================================================== */}
                {/* WORK ORDER USAGE HISTORY                                    */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Work order usage history
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                            Work order
                                        </th>

                                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                            Date
                                        </th>

                                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                            Quantity
                                        </th>

                                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                            Type / Vehicle
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {stock.workOrderHistory.map(
                                        (item) => (
                                            <tr
                                                key={
                                                    item.workOrder
                                                }
                                                className="border-b border-gray-100 last:border-b-0"
                                            >
                                                <td className="px-3 py-2.5 text-[10px] font-medium text-gray-800">
                                                    {
                                                        item.workOrder
                                                    }
                                                </td>

                                                <td className="px-3 py-2.5 text-[10px] font-medium text-gray-800">
                                                    {item.date}
                                                </td>

                                                <td className="px-3 py-2.5 text-[10px] font-medium text-gray-800">
                                                    {
                                                        item.quantity
                                                    }{" "}
                                                    {
                                                        getPluralizedUnit(
                                                            stock.unitOfMeasure,
                                                            item.quantity,
                                                        )
                                                    }
                                                </td>

                                                <td className="px-3 py-2.5 text-[10px] font-medium text-gray-800">
                                                    {item.type}
                                                    {" — "}
                                                    {
                                                        item.vehicle
                                                    }
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>

            {/* ============================================================= */}
            {/* DEACTIVATE MODAL                                               */}
            {/* ============================================================= */}

            {showDeactivateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div
                        className="w-full max-w-[460px] rounded-lg bg-white p-5 shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deactivate-part-title"
                    >
                        {/* ================================================== */}
                        {/* Modal Header                                         */}
                        {/* ================================================== */}

                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                                <AlertTriangle
                                    className="h-4 w-4 text-red-500"
                                    strokeWidth={1.8}
                                />
                            </div>

                            <div>
                                <h2
                                    id="deactivate-part-title"
                                    className="text-sm font-semibold text-gray-900"
                                >
                                    Deactivate this part?
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    This will deactivate{" "}
                                    <span className="font-medium text-gray-700">
                                        &quot;
                                        {stock.partName}
                                        &quot;
                                    </span>{" "}
                                    from the part register.
                                </p>
                            </div>
                        </div>

                        {/* ================================================== */}
                        {/* Reason                                                */}
                        {/* ================================================== */}

                        <div className="mt-4">
                            <label
                                htmlFor="deactivate-reason"
                                className="mb-1.5 block text-xs font-medium text-gray-700"
                            >
                                Reason
                                <span className="ml-1 text-red-500">
                                    *
                                </span>
                            </label>

                            <textarea
                                id="deactivate-reason"
                                value={deactivateReason}
                                onChange={(event) => {
                                    const value =
                                        event.target
                                            .value;

                                    setDeactivateReason(
                                        value,
                                    );

                                    if (
                                        value.trim()
                                    ) {
                                        setDeactivateReasonError(
                                            "",
                                        );
                                    }
                                }}
                                placeholder="Enter reason for deactivation..."
                                rows={3}
                                className={[
                                    "w-full resize-none rounded-md bg-white px-3 py-2 text-xs text-gray-900 outline-none placeholder:text-gray-400",
                                    deactivateReasonError
                                        ? "border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                                        : "border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-200",
                                ].join(" ")}
                            />

                            {deactivateReasonError && (
                                <p className="mt-1 text-xs text-red-500">
                                    {
                                        deactivateReasonError
                                    }
                                </p>
                            )}
                        </div>

                        {/* ================================================== */}
                        {/* Modal Actions                                        */}
                        {/* ================================================== */}

                        <div className="mt-5 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={
                                    handleCancelDeactivate
                                }
                                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="neutral"
                                onClick={
                                    handleDeactivate
                                }
                                className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                            >
                                Deactivate
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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
/* Unit Helper                                                                */
/* -------------------------------------------------------------------------- */

function getPluralizedUnit(
    unit: string,
    quantity: number,
) {
    const normalizedUnit = unit.toLowerCase();

    if (quantity === 1) {
        return normalizedUnit;
    }

    if (normalizedUnit === "set") {
        return "sets";
    }

    if (normalizedUnit === "pair") {
        return "pairs";
    }

    if (normalizedUnit === "each") {
        return "each";
    }

    if (normalizedUnit === "kg") {
        return "kg";
    }

    if (normalizedUnit === "litre") {
        return "litres";
    }

    if (normalizedUnit === "box") {
        return "boxes";
    }

    return `${normalizedUnit}s`;
} 