"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {  X } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type StockReceiptStatus = "active" | "inactive";

type StockReceiptRecord = {
    id: string;
    receiptNumber: string;
    partName: string;
    partNumber: string;
    purchaseInvoice: string;
    destinationLocation: string;
    quantityReceived: number;
    unitOfMeasure: string;
    unitCost: number;
    batchLotReference: string;
    notes: string;
    status: StockReceiptStatus;
};

/* -------------------------------------------------------------------------- */
/* Mock Stock Receipt Records                                                 */
/* -------------------------------------------------------------------------- */

const MOCK_STOCK_RECEIPTS: StockReceiptRecord[] = [
    {
        id: "receipt-001",
        receiptNumber: "SR-2026-0001",
        partName: "Brake Pad Set (Front+Rear)",
        partNumber: "PRT-10018",
        purchaseInvoice: "INV-2026-0145",
        destinationLocation: "Bhandup Workshop",
        quantityReceived: 25,
        unitOfMeasure: "Set",
        unitCost: 1250,
        batchLotReference: "BATCH-BP-0926",
        notes: "Received against approved purchase invoice.",
        status: "active",
    },
    {
        id: "receipt-002",
        receiptNumber: "SR-2026-0002",
        partName: "Fuel Filter",
        partNumber: "PRT-10019",
        purchaseInvoice: "INV-2026-0148",
        destinationLocation: "Bhiwandi Warehouse",
        quantityReceived: 40,
        unitOfMeasure: "Each",
        unitCost: 320,
        batchLotReference: "FF-SEP-2026",
        notes: "Initial stock receipt.",
        status: "active",
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString("en-IN")}`;
};

const getTotalCost = (
    quantity: number,
    unitCost: number,
) => {
    return quantity * unitCost;
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StockReceiptViewPage() {
    const params = useParams();
    const router = useRouter();

    const receiptId = String(params.id);

    const [receipt, setReceipt] = useState<StockReceiptRecord>(
        MOCK_STOCK_RECEIPTS.find(
            (item) => item.id === receiptId,
        ) ?? MOCK_STOCK_RECEIPTS[0],
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
    /* Edit                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleEdit = () => {
        router.push(
            `/inventory/stock-receipt/${receipt.id}/edit`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Deactivate                                                             */
    /* ---------------------------------------------------------------------- */

    const handleDeactivate = () => {
        const reason = deactivateReason.trim();

        if (!reason) {
            setDeactivateReasonError(
                "Reason is required.",
            );
            return;
        }

        setReceipt((previous) => ({
            ...previous,
            status: "inactive",
        }));

        console.log("Stock receipt deactivated:", {
            receiptId: receipt.id,
            reason,
        });

        setShowDeactivateModal(false);
        setDeactivateReason("");
        setDeactivateReasonError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Cancel Deactivate                                                      */
    /* ---------------------------------------------------------------------- */

    const handleCancelDeactivate = () => {
        setShowDeactivateModal(false);
        setDeactivateReason("");
        setDeactivateReasonError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Activate                                                                */
    /* ---------------------------------------------------------------------- */

    const handleActivate = () => {
        setReceipt((previous) => ({
            ...previous,
            status: "active",
        }));

        console.log(
            "Stock receipt activated:",
            receipt.id,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                       */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">

                {/* ========================================================== */}
                {/* HEADER                                                       */}
                {/* ========================================================== */}

                <div className="mb-4 flex items-start justify-between">

                    {/* Receipt Number + Status */}

                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {receipt.receiptNumber}
                            </h1>

                            {receipt.status === "active" ? (
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
                            {receipt.partName}
                            {" — "}
                            {receipt.partNumber}
                        </p>
                    </div>

                    {/* ====================================================== */}
                    {/* ACTIONS                                                   */}
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

                        {receipt.status === "active" ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={() => {
                                    setDeactivateReason("");
                                    setDeactivateReasonError("");
                                    setShowDeactivateModal(true);
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
                {/* RECEIPT DETAILS                                              */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Receipt details
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                        <InfoRow
                            label="Receipt number"
                            value={receipt.receiptNumber}
                        />

                        <InfoRow
                            label="Part"
                            value={receipt.partName}
                        />

                        <InfoRow
                            label="Part number"
                            value={receipt.partNumber}
                        />

                        <InfoRow
                            label="Purchase invoice"
                            value={receipt.purchaseInvoice}
                        />

                        <InfoRow
                            label="Destination location"
                            value={receipt.destinationLocation}
                        />

                    </div>
                </section>

                {/* ========================================================== */}
                {/* QUANTITY & COST                                              */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Quantity & cost
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                        <InfoRow
                            label="Quantity received"
                            value={`${receipt.quantityReceived} ${receipt.unitOfMeasure}`}
                        />

                        <InfoRow
                            label="Unit of measure"
                            value={receipt.unitOfMeasure}
                        />

                        <InfoRow
                            label="Unit cost"
                            value={formatCurrency(receipt.unitCost)}
                        />

                        <InfoRow
                            label="Total cost"
                            value={formatCurrency(
                                getTotalCost(
                                    receipt.quantityReceived,
                                    receipt.unitCost,
                                ),
                            )}
                        />

                    </div>
                </section>

                {/* ========================================================== */}
                {/* BATCH / LOT                                                  */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Batch / lot
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                        <InfoRow
                            label="Batch / lot reference"
                            value={
                                receipt.batchLotReference || "—"
                            }
                        />

                    </div>
                </section>

                {/* ========================================================== */}
                {/* NOTES                                                        */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Notes
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div className="px-3 py-3">
                            <p className="text-[10px] leading-5 text-gray-700">
                                {receipt.notes || "—"}
                            </p>
                        </div>
                    </div>
                </section>

                {/* ========================================================== */}
                {/* STOCK IMPACT NOTE                                            */}
                {/* ========================================================== */}

                <div className="mt-4 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <InfoIcon />

                    <p className="text-[10px] leading-4 text-gray-500">
                        This stock receipt represents inventory received
                        against the purchase invoice. The received quantity
                        is added to the destination location&apos;s stock balance.
                    </p>
                </div>

                {/* ========================================================== */}
                {/* DEACTIVATE MODAL                                             */}
                {/* ========================================================== */}

                {/* ============================================================== */}
                {/* DEACTIVATE MODAL                                               */}
                {/* ============================================================== */}

                {showDeactivateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
                        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">

                            {/* -------------------------------------------------- */}
                            {/* Modal Header                                        */}
                            {/* -------------------------------------------------- */}

                            <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        Deactivate Stock Receipt
                                    </h3>

                                    <p className="mt-0.5 text-[10px] leading-4 text-gray-500">
                                        Deactivate{" "}
                                        <span className="font-medium text-gray-700">
                                            {receipt.receiptNumber}
                                        </span>
                                        ? This stock receipt will no longer be considered
                                        active.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCancelDeactivate}
                                    aria-label="Close modal"
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                >
                                    <X
                                        className="h-4 w-4"
                                        strokeWidth={1.8}
                                    />
                                </button>
                            </div>

                            {/* -------------------------------------------------- */}
                            {/* Modal Body                                          */}
                            {/* -------------------------------------------------- */}

                            <div className="px-4 py-4">
                                <label
                                    htmlFor="deactivate-reason"
                                    className="mb-1.5 block text-[10px] font-semibold text-gray-700"
                                >
                                    Reason
                                    <span className="ml-0.5 text-red-500">
                                        *
                                    </span>
                                </label>

                                <textarea
                                    id="deactivate-reason"
                                    value={deactivateReason}
                                    onChange={(event) => {
                                        setDeactivateReason(event.target.value);

                                        if (deactivateReasonError) {
                                            setDeactivateReasonError("");
                                        }
                                    }}
                                    placeholder="Enter reason for deactivating this stock receipt"
                                    rows={3}
                                    className={[
                                        "w-full resize-none rounded-md border bg-white px-3 py-2 text-xs text-gray-800 outline-none",
                                        "placeholder:text-gray-400",
                                        "focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]",
                                        deactivateReasonError
                                            ? "border-red-400"
                                            : "border-gray-300",
                                    ].join(" ")}
                                />

                                {deactivateReasonError && (
                                    <p className="mt-1.5 text-[10px] text-red-500">
                                        {deactivateReasonError}
                                    </p>
                                )}
                            </div>

                            {/* -------------------------------------------------- */}
                            {/* Modal Footer                                        */}
                            {/* -------------------------------------------------- */}

                            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
                                <Button
                                    type="button"
                                    variant="neutral"
                                    onClick={handleCancelDeactivate}
                                    className="h-8 border-gray-300 bg-white px-4 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    variant="neutral"
                                    onClick={handleDeactivate}
                                    className="h-8 border-red-500 bg-red-500 px-4 text-xs font-medium text-white hover:bg-red-600"
                                >
                                    Deactivate
                                </Button>
                            </div>
                        </div>
                    </div>
                )}


            </div>
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
/* Info Icon                                                                  */
/* -------------------------------------------------------------------------- */

function InfoIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.8"
            />

            <path
                d="M12 10.5V16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />

            <circle
                cx="12"
                cy="7.5"
                r="1"
                fill="currentColor"
            />
        </svg>
    );
}