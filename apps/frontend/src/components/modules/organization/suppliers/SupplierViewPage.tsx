"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type SupplierStatus = "active" | "inactive";

type Supplier = {
    id: string;
    name: string;
    status: SupplierStatus;
    supplierType: string;

    contactPerson: string;
    phone: string;
    email: string;
    agreementReference: string;
    address: string;

    linkedParts: {
        part: string;
        category: string;
        lastBatchReceived: string;
        onHandQty: number;
    }[];
};

/* -------------------------------------------------------------------------- */
/* Mock Supplier                                                              */
/* -------------------------------------------------------------------------- */

const MOCK_SUPPLIER: Supplier = {
    id: "supplier-001",

    name: "Skyline Parts Distributors",

    status: "active",

    supplierType: "Spare Parts",

    contactPerson: "Meenal Kulkarni",

    phone: "+91 98670 22110",

    email: "meenal@skylineparts.com",

    agreementReference: "AGR-2025-0087",

    address:
        "MIDC Industrial Estate, Bhiwandi, Thane",

    linkedParts: [
        {
            part: "Brake Pad Set — Standard",
            category: "Braking",
            lastBatchReceived: "18-Sep-2026",
            onHandQty: 42,
        },
        {
            part: "Chain Sprocket Kit",
            category: "Drivetrain",
            lastBatchReceived: "12-Sep-2026",
            onHandQty: 27,
        },
        {
            part: "LED Headlamp Assembly",
            category: "Electrical",
            lastBatchReceived: "05-Sep-2026",
            onHandQty: 16,
        },
        {
            part: "Suspension Bush Set",
            category: "Suspension",
            lastBatchReceived: "29-Aug-2026",
            onHandQty: 35,
        },
    ],
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function SupplierViewPage() {
    const router = useRouter();

    const [supplier, setSupplier] =
        useState<Supplier>(MOCK_SUPPLIER);

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
            `/organization/suppliers/${supplier.id}/edit`
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Deactivate                                                             */
    /* ---------------------------------------------------------------------- */

    const handleDeactivate = () => {
        const reason = deactivateReason.trim();

        if (!reason) {
            setDeactivateReasonError(
                "Reason is required."
            );
            return;
        }

        setSupplier((previous) => ({
            ...previous,
            status: "inactive",
        }));

        console.log("Supplier deactivated:", {
            supplierId: supplier.id,
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
        setSupplier((previous) => ({
            ...previous,
            status: "active",
        }));

        console.log(
            "Supplier activated:",
            supplier.id
        );
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">

                {/* ========================================================== */}
                {/* Header                                                     */}
                {/* ========================================================== */}

                <div className="mb-4 flex items-start justify-between">

                    {/* Supplier Name + Status */}

                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-gray-900">
                            {supplier.name}
                        </h1>

                        {supplier.status ===
                            "active" ? (
                            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                                {supplier.supplierType}
                            </span>
                        ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                Inactive
                            </span>
                        )}
                    </div>

                    {/* ====================================================== */}
                    {/* Actions                                                  */}
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

                        {supplier.status ===
                            "active" ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={() => {
                                    setDeactivateReason(
                                        ""
                                    );
                                    setDeactivateReasonError(
                                        ""
                                    );
                                    setShowDeactivateModal(
                                        true
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
                                onClick={
                                    handleActivate
                                }
                                className="h-9 border-[#FE5720] bg-white px-5 text-[#FE5720] hover:bg-orange-50"
                            >
                                Activate
                            </Button>
                        )}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Supplier Information                                       */}
                {/* ========================================================== */}

                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">

                    {/* First Row */}

                    <div className="grid grid-cols-4 gap-6">

                        <InfoItem
                            label="CONTACT PERSON"
                            value={
                                supplier.contactPerson
                            }
                        />

                        <InfoItem
                            label="PHONE"
                            value={
                                supplier.phone
                            }
                        />

                        <InfoItem
                            label="EMAIL"
                            value={
                                supplier.email
                            }
                        />

                        <InfoItem
                            label="AGREEMENT REFERENCE"
                            value={
                                supplier.agreementReference
                            }
                        />
                    </div>

                    {/* Address */}

                    <div className="mt-3">
                        <p className="text-[10px] font-medium text-gray-400">
                            ADDRESS
                        </p>

                        <p className="mt-0.5 text-xs text-gray-600">
                            {supplier.address}
                        </p>
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Linked Parts                                               */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Linked parts
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200">

                                    <th className="px-3 py-2 text-[10px] font-medium text-gray-400">
                                        PART
                                    </th>

                                    <th className="px-3 py-2 text-[10px] font-medium text-gray-400">
                                        CATEGORY
                                    </th>

                                    <th className="px-3 py-2 text-[10px] font-medium text-gray-400">
                                        LAST BATCH RECEIVED
                                    </th>

                                    <th className="px-3 py-2 text-[10px] font-medium text-gray-400">
                                        ON-HAND QTY
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {supplier.linkedParts.map(
                                    (part) => (
                                        <tr
                                            key={part.part}
                                            className="border-b border-gray-100 last:border-0"
                                        >
                                            <td className="px-3 py-2.5 text-xs text-gray-700">
                                                {part.part}
                                            </td>

                                            <td className="px-3 py-2.5 text-xs text-gray-700">
                                                {part.category}
                                            </td>

                                            <td className="px-3 py-2.5 text-xs text-gray-700">
                                                {
                                                    part.lastBatchReceived
                                                }
                                            </td>

                                            <td className="px-3 py-2.5 text-xs text-gray-700">
                                                {
                                                    part.onHandQty
                                                }
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* ============================================================= */}
            {/* DEACTIVATE MODAL                                              */}
            {/* ============================================================= */}

            {showDeactivateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div
                        className="w-full max-w-[460px] rounded-lg bg-white p-5 shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deactivate-supplier-title"
                    >
                        {/* Modal Header */}
                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                                <AlertTriangle
                                    className="h-4 w-4 text-red-500"
                                    strokeWidth={1.8}
                                />
                            </div>

                            <div>
                                <h2
                                    id="deactivate-supplier-title"
                                    className="text-sm font-semibold text-gray-900"
                                >
                                    Deactivate this supplier?
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    This will deactivate{" "}
                                    <span className="font-medium text-gray-700">
                                        &quot;
                                        {supplier.name}
                                        &quot;
                                    </span>{" "}
                                    from the supplier register.
                                </p>
                            </div>
                        </div>

                        {/* Required Reason */}
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
                                        event.target.value;

                                    setDeactivateReason(value);

                                    if (value.trim()) {
                                        setDeactivateReasonError("");
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
                                    {deactivateReasonError}
                                </p>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="mt-5 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleCancelDeactivate}
                                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleDeactivate}
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
/* Info Item                                                                  */
/* -------------------------------------------------------------------------- */

function InfoItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-[10px] font-medium text-gray-400">
                {label}
            </p>

            <p className="mt-0.5 text-xs font-medium text-gray-800">
                {value}
            </p>
        </div>
    );
}