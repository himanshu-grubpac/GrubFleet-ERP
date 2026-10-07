"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type PartsRequestStatus = "Fulfilled" | "Blocked";

type PartsRequest = {
    id: string;
    date: string;
    workOrder: string;
    part: string;
    partNumber?: string;
    quantity: string;
    location: string;
    type: "Internal" | "External";
    vehicle: string;
    status: PartsRequestStatus;
    outcome: {
        type: "success" | "warning";
        message: string;
    };
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_PARTS_REQUESTS: PartsRequest[] = [
    {
        id: "request-001",
        date: "25-Sep-2026",
        workOrder: "WO-2026-1163",
        part: "Cargo Box Hinge Kit",
        partNumber: "PRT-10091",
        quantity: "2 kits",
        location: "Malad Workshop",
        type: "Internal",
        vehicle: "VH-1013",
        status: "Blocked",
        outcome: {
            type: "warning",
            message:
                "Only 1 kit on hand at Malad Workshop — 2 requested. Blocked, no override; re-request once Stock Receipt adds more.",
        },
    },
    {
        id: "request-002",
        date: "24-Sep-2026",
        workOrder: "WO-2026-1160",
        part: "Battery (12V Lead-Acid)",
        partNumber: "PRT-10128",
        quantity: "12 each",
        location: "Bhiwandi Warehouse",
        type: "Internal",
        vehicle: "VH-1012",
        status: "Blocked",
        outcome: {
            type: "warning",
            message:
                "Only 9 each on hand at Bhiwandi Warehouse — 12 requested. Blocked, no override; re-request once Stock Receipt adds more.",
        },
    },
    {
        id: "request-003",
        date: "22-Sep-2026",
        workOrder: "WO-2026-1150",
        part: "Tyre — 3.00-10",
        partNumber: "PRT-10007",
        quantity: "2 each",
        location: "Malad Workshop",
        type: "Internal",
        vehicle: "VH-1004",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "Fulfilled immediately on 22-Sep-2026 — 2 each deducted from Stock Balance at Malad Workshop. No approval step; the compatibility and stock checks both passed.",
        },
    },
    {
        id: "request-004",
        date: "20-Sep-2026",
        workOrder: "WO-2026-1142",
        part: "Brake Pad Set (Front+Rear)",
        partNumber: "PRT-10018",
        quantity: "1 set",
        location: "Bhandup Workshop",
        type: "Internal",
        vehicle: "VH-1006",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "Fulfilled immediately on 20-Sep-2026 — 1 set deducted from Stock Balance at Bhandup Workshop. No approval step; the compatibility and stock checks both passed.",
        },
    },
    {
        id: "request-005",
        date: "15-Sep-2026",
        workOrder: "WO-2026-1135",
        part: "Engine Oil (1L)",
        partNumber: "PRT-10102",
        quantity: "4 litres",
        location: "Bhandup Workshop",
        type: "Internal",
        vehicle: "VH-1009",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "Fulfilled immediately on 15-Sep-2026 — 4 litres deducted from Stock Balance at Bhandup Workshop. No approval step; the compatibility and stock checks both passed.",
        },
    },
    {
        id: "request-006",
        date: "10-Sep-2026",
        workOrder: "WO-2026-1120",
        part: "Chain Sprocket Kit",
        partNumber: "PRT-10025",
        quantity: "1 kit",
        location: "Bhandup Workshop",
        type: "Internal",
        vehicle: "VH-1001",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "Fulfilled immediately on 10-Sep-2026 — 1 kit deducted from Stock Balance at Bhandup Workshop. No approval step; the compatibility and stock checks both passed.",
        },
    },
    {
        id: "request-007",
        date: "06-Sep-2026",
        workOrder: "WO-2026-1108",
        part: "Spark Plug",
        partNumber: "PRT-10041",
        quantity: "4 each",
        location: "Thane Workshop",
        type: "External",
        vehicle: "VH-1011",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "Fulfilled immediately on 06-Sep-2026 — 4 each deducted from Stock Balance at Thane Workshop. No approval step; the compatibility and stock checks both passed.",
        },
    },
    {
        id: "request-008",
        date: "02-Sep-2026",
        workOrder: "WO-2026-1098",
        part: "Brake Pad Set (Front+Rear)",
        quantity: "1 set",
        location: "Bhandup Workshop",
        type: "External",
        vehicle: "VH-2004",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "This parts request was fulfilled successfully.",
        },
    },
    {
        id: "request-009",
        date: "29-Aug-2026",
        workOrder: "WO-2026-1090",
        part: "Headlamp Assembly",
        quantity: "1 each",
        location: "Bhandup Workshop",
        type: "External",
        vehicle: "VH-1014",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "This parts request was fulfilled successfully.",
        },
    },
    {
        id: "request-010",
        date: "18-Aug-2026",
        workOrder: "WO-2026-1054",
        part: "Brake Pad Set (Front+Rear)",
        quantity: "2 sets",
        location: "Bhandup Workshop",
        type: "Internal",
        vehicle: "VH-1007",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "This parts request was fulfilled successfully.",
        },
    },
    {
        id: "request-011",
        date: "15-Aug-2026",
        workOrder: "WO-2026-1048",
        part: "Air Filter",
        quantity: "3 each",
        location: "Malad Workshop",
        type: "Internal",
        vehicle: "VH-1015",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "This parts request was fulfilled successfully.",
        },
    },
    {
        id: "request-012",
        date: "12-Aug-2026",
        workOrder: "WO-2026-1039",
        part: "Clutch Cable",
        quantity: "2 each",
        location: "Thane Workshop",
        type: "External",
        vehicle: "VH-1008",
        status: "Fulfilled",
        outcome: {
            type: "success",
            message:
                "This parts request was fulfilled successfully.",
        },
    },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function PartsRequestViewPage() {
    const params = useParams();
    const router = useRouter();

    const requestId = String(params.id);

    const requestFromMock = MOCK_PARTS_REQUESTS.find(
        (item) => item.id === requestId,
    );

    const [request] = useState<PartsRequest | undefined>(
        requestFromMock,
    );

    /* ---------------------------------------------------------------------- */
    /* Status                                                                  */
    /* ---------------------------------------------------------------------- */

    const [isDeactivated, setIsDeactivated] = useState(false);

    /* ---------------------------------------------------------------------- */
    /* Deactivate Modal                                                        */
    /* ---------------------------------------------------------------------- */

    const [isDeactivateModalOpen, setIsDeactivateModalOpen] =
        useState(false);

    const [deactivateReason, setDeactivateReason] = useState("");

    const [deactivateError, setDeactivateError] = useState("");

    /* ---------------------------------------------------------------------- */
    /* Activate Modal                                                          */
    /* ---------------------------------------------------------------------- */

    const [isActivateModalOpen, setIsActivateModalOpen] =
        useState(false);

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                              */
    /* ---------------------------------------------------------------------- */

    const handleBack = () => {
        router.push("/inventory/parts-requests");
    };

    /* ---------------------------------------------------------------------- */
    /* Deactivate                                                             */
    /* ---------------------------------------------------------------------- */

    const handleOpenDeactivateModal = () => {
        setDeactivateReason("");
        setDeactivateError("");
        setIsDeactivateModalOpen(true);
    };

    const handleCloseDeactivateModal = () => {
        setIsDeactivateModalOpen(false);
        setDeactivateReason("");
        setDeactivateError("");
    };

    const handleDeactivate = () => {
        const trimmedReason = deactivateReason.trim();

        if (!trimmedReason) {
            setDeactivateError(
                "Please enter a reason before deactivating this request.",
            );
            return;
        }

        setIsDeactivated(true);
        setIsDeactivateModalOpen(false);
        setDeactivateReason("");
        setDeactivateError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Activate                                                               */
    /* ---------------------------------------------------------------------- */

    const handleOpenActivateModal = () => {
        setIsActivateModalOpen(true);
    };

    const handleCloseActivateModal = () => {
        setIsActivateModalOpen(false);
    };

    const handleActivate = () => {
        setIsDeactivated(false);
        setIsActivateModalOpen(false);
    };

    /* ---------------------------------------------------------------------- */
    /* Not Found                                                               */
    /* ---------------------------------------------------------------------- */

    if (!request) {
        return (
            <div className="min-h-full bg-gray-50">
                <div className="px-5 py-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <p className="text-sm text-gray-500">
                            Parts request not found.
                        </p>

                        <button
                            type="button"
                            onClick={handleBack}
                            className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
                        >
                            Back to Parts Requests
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">
                {/* ========================================================== */}
                {/* Page Header                                                   */}
                {/* ========================================================== */}

                <div className="mb-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {request.workOrder}
                            </h1>

                            <span
                                className={[
                                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                    request.status === "Fulfilled"
                                        ? "bg-green-50 text-green-700"
                                        : "bg-red-50 text-red-600",
                                ].join(" ")}
                            >
                                {request.status}
                            </span>

                            {isDeactivated && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                    Inactive
                                </span>
                            )}
                        </div>

                        {/* ================================================== */}
                        {/* Activate / Deactivate Action                       */}
                        {/* ================================================== */}

                        {isDeactivated ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleOpenActivateModal}
                                className="h-8 border-[#FE5720] bg-[#FE5720] px-4 text-xs font-medium text-white hover:bg-[#E94E1C]"
                            >
                                Activate
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleOpenDeactivateModal}
                                className="h-8 border-red-500 bg-white px-4 text-xs font-medium text-red-500 hover:bg-red-50"
                            >
                                Deactivate
                            </Button>
                        )}
                    </div>

                    <p className="mt-0.5 text-[10px] text-gray-500">
                        Requested against {request.vehicle} (
                        {request.type}).
                    </p>
                </div>

                {/* ========================================================== */}
                {/* REQUEST                                                       */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Request
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <InfoRow
                            label="Part"
                            value={
                                request.partNumber
                                    ? `${request.part} (${request.partNumber})`
                                    : request.part
                            }
                        />

                        <InfoRow
                            label="Quantity requested"
                            value={request.quantity}
                        />

                        <InfoRow
                            label="Location"
                            value={request.location}
                        />

                        <InfoRow
                            label="Type / Vehicle"
                            value={`${request.type} — ${request.vehicle}`}
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* OUTCOME                                                       */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Outcome
                    </h2>

                    <div
                        className={[
                            "flex items-start gap-2 rounded-lg border px-3 py-2.5",
                            request.outcome.type === "success"
                                ? "border-green-200 bg-green-50"
                                : "border-orange-200 bg-orange-50",
                        ].join(" ")}
                    >
                        {request.outcome.type === "success" ? (
                            <Check
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600"
                                strokeWidth={2}
                            />
                        ) : (
                            <AlertTriangle
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FE5720]"
                                strokeWidth={2}
                            />
                        )}

                        <p
                            className={[
                                "text-[10px] leading-4",
                                request.outcome.type === "success"
                                    ? "text-green-700"
                                    : "text-[#B45309]",
                            ].join(" ")}
                        >
                            {request.outcome.message}
                        </p>
                    </div>
                </section>

                {/* ========================================================== */}
                {/* DEACTIVATED MESSAGE                                          */}
                {/* ========================================================== */}

                {isDeactivated && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                        <p className="text-[10px] font-medium text-gray-600">
                            This parts request has been deactivated.
                        </p>

                        <p className="mt-0.5 text-[9px] leading-3.5 text-gray-500">
                            The request remains available for reference but
                            is no longer active.
                        </p>
                    </div>
                )}
            </div>

            {/* ============================================================== */}
            {/* DEACTIVATE MODAL                                               */}
            {/* ============================================================== */}

            {isDeactivateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
                    <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">

                        {/* -------------------------------------------------- */}
                        {/* Modal Header                                        */}
                        {/* -------------------------------------------------- */}

                        <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Deactivate Parts Request
                                </h3>

                                <p className="mt-0.5 text-[10px] leading-4 text-gray-500">
                                    Deactivate {request.workOrder}? This
                                    request will no longer be considered active.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseDeactivateModal}
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

                                    if (deactivateError) {
                                        setDeactivateError("");
                                    }
                                }}
                                placeholder="Enter reason for deactivating this request"
                                rows={3}
                                className={[
                                    "w-full resize-none rounded-md border bg-white px-3 py-2 text-xs text-gray-800 outline-none",
                                    "placeholder:text-gray-400",
                                    "focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]",
                                    deactivateError
                                        ? "border-red-400"
                                        : "border-gray-300",
                                ].join(" ")}
                            />

                            {deactivateError && (
                                <p className="mt-1.5 text-[10px] text-red-500">
                                    {deactivateError}
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
                                onClick={handleCloseDeactivateModal}
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

            {/* ============================================================== */}
            {/* ACTIVATE MODAL                                                 */}
            {/* ============================================================== */}

            {isActivateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
                    <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">

                        {/* -------------------------------------------------- */}
                        {/* Modal Header                                        */}
                        {/* -------------------------------------------------- */}

                        <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Activate Parts Request
                                </h3>

                                <p className="mt-0.5 text-[10px] leading-4 text-gray-500">
                                    Activate {request.workOrder}? This
                                    request will become active again.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseActivateModal}
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
                            <div className="rounded-md border border-orange-100 bg-orange-50 px-3 py-2.5">
                                <p className="text-[10px] leading-4 text-gray-600">
                                    This will make the parts request active
                                    again and allow it to appear as an active
                                    request.
                                </p>
                            </div>
                        </div>

                        {/* -------------------------------------------------- */}
                        {/* Modal Footer                                        */}
                        {/* -------------------------------------------------- */}

                        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleCloseActivateModal}
                                className="h-8 border-gray-300 bg-white px-4 text-xs text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleActivate}
                                className="h-8 border-[#FE5720] bg-[#FE5720] px-4 text-xs font-medium text-white hover:bg-[#E94E1C]"
                            >
                                Activate
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

            <p className="w-1/2 text-right text-[10px] font-semibold text-gray-800">
                {value}
            </p>
        </div>
    );
}