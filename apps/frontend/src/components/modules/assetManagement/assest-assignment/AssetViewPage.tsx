"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AssignmentStatus =
    | "available"
    | "assigned"
    | "contract-required";

type AssetAssignmentDetails = {
    id: string;
    fleetCode: string;
    assetClass: string;
    registrationNumber: string;
    odometerReading: string;

    registrationStartDate: string;
    registrationEndDate: string;

    modelYear: string;
    chassisNumber: string;

    insuranceSupplier: string;
    insurancePremium: string;
    insuranceStartDate: string;
    insuranceEndDate: string;

    warrantyStartDate: string;
    warrantyEndDate: string;

    purchaseInvoice: string;
    notes: string;

    status: AssignmentStatus;

    client?: {
        id: string;
        name: string;
    };

    leaseContract?: {
        id: string;
        contractNumber: string;
        status: "Active" | "Expired" | "Draft";
        startDate: string;
        endDate: string;
        matchingLine: string;
        allocated: number;
        total: number;
    };
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_ASSIGNMENT_ASSETS: AssetAssignmentDetails[] = [
    {
        id: "vehicle-001",
        fleetCode: "VH-1001",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1001",
        odometerReading: "12,480 km",

        registrationStartDate: "01-Apr-2024",
        registrationEndDate: "31-Mar-2039",

        modelYear: "2023",
        chassisNumber: "MD2A1XX1234567890",

        insuranceSupplier: "ICICI Lombard",
        insurancePremium: "Rs. 3,200/yr",
        insuranceStartDate: "15-Mar-2026",
        insuranceEndDate: "14-Mar-2027",

        warrantyStartDate: "14-Mar-2023",
        warrantyEndDate: "14-Mar-2026",

        purchaseInvoice: "PINV-2023-0031",

        notes: "Standard fleet vehicle. No additional notes.",

        status: "assigned",

        client: {
            id: "client-001",
            name: "Silverline Distribution Co",
        },

        leaseContract: {
            id: "contract-001",
            contractNumber: "LEASE-2026-0098",
            status: "Active",
            startDate: "01-Sep-2026",
            endDate: "31-Aug-2028",
            matchingLine: "Petrol Scooter — Standard",
            allocated: 11,
            total: 14,
        },
    },

    {
        id: "vehicle-002",
        fleetCode: "VH-1002",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1002",
        odometerReading: "8,930 km",

        registrationStartDate: "02-Apr-2024",
        registrationEndDate: "01-Apr-2039",

        modelYear: "2024",
        chassisNumber: "MD2A1XX1234567891",

        insuranceSupplier: "HDFC ERGO",
        insurancePremium: "Rs. 3,400/yr",
        insuranceStartDate: "21-Aug-2026",
        insuranceEndDate: "20-Aug-2027",

        warrantyStartDate: "20-Aug-2024",
        warrantyEndDate: "20-Aug-2026",

        purchaseInvoice: "PINV-2024-0042",

        notes: "Standard fleet vehicle. No additional notes.",

        status: "available",
    },

    {
        id: "vehicle-008",
        fleetCode: "VH-1008",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1008",
        odometerReading: "9,540 km",

        registrationStartDate: "05-Feb-2026",
        registrationEndDate: "04-Feb-2041",

        modelYear: "2025",
        chassisNumber: "MD2A1XX1234567898",

        insuranceSupplier: "ICICI Lombard",
        insurancePremium: "Rs. 3,500/yr",
        insuranceStartDate: "05-Feb-2026",
        insuranceEndDate: "04-Feb-2027",

        warrantyStartDate: "05-Feb-2026",
        warrantyEndDate: "05-Feb-2029",

        purchaseInvoice: "PINV-2026-0078",

        notes: "Recently added fleet vehicle.",

        status: "contract-required",
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getStatusLabel = (status: AssignmentStatus) => {
    switch (status) {
        case "available":
            return "Available";

        case "assigned":
            return "Assigned";

        case "contract-required":
            return "Contract Required";

        default:
            return status;
    }
};

const getStatusClass = (status: AssignmentStatus) => {
    switch (status) {
        case "available":
            return "bg-orange-50 text-[#FE5720]";

        case "assigned":
            return "bg-blue-50 text-blue-700";

        case "contract-required":
            return "bg-yellow-50 text-yellow-700";

        default:
            return "bg-gray-100 text-gray-500";
    }
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AssetAssignmentViewPage() {
    const params = useParams();
    const router = useRouter();

    const assetId = String(params.id);

    const [asset] = useState<AssetAssignmentDetails | undefined>(
        MOCK_ASSIGNMENT_ASSETS.find(
            (item) => item.id === assetId,
        ),
    );

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                              */
    /* ---------------------------------------------------------------------- */

    const handleBack = () => {
        router.push("/asset-register/asset-assignment");
    };

    /**
     * Assignment is a separate flow from the view page.
     *
     * The view page only displays the current state of the asset.
     * The assign page handles:
     *
     * 1. Client selection
     * 2. Active lease contract selection
     * 3. Matching contract line
     * 4. Allocation validation
     * 5. Final assignment
     */
    const handleAssign = () => {
        if (!asset) return;

        router.push(
            `/asset-register/asset-assignment/${asset.id}/assign`,
        );
    };

    const handleViewContract = () => {
        if (!asset?.leaseContract) return;

        router.push(
            `/lease-contract/${asset.leaseContract.id}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Not Found                                                              */
    /* ---------------------------------------------------------------------- */

    if (!asset) {
        return (
            <div className="min-h-full bg-gray-50">
                <div className="px-5 py-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <p className="text-sm text-gray-500">
                            Asset not found.
                        </p>

                        <button
                            type="button"
                            onClick={handleBack}
                            className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
                        >
                            Back to asset assignment
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Assignment State                                                       */
    /* ---------------------------------------------------------------------- */

    const hasActiveContract =
        asset.leaseContract?.status === "Active";

    /**
     * Asset can only be assigned when:
     *
     * - It is currently available
     * - An active lease contract exists
     *
     * The actual client/contract selection still happens on
     * the separate Assign page.
     */
    const canAssign =
        asset.status === "available" &&
        hasActiveContract;

    /* ---------------------------------------------------------------------- */
    /* UI                                                                     */
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
                                {asset.fleetCode}
                            </h1>

                            <span
                                className={[
                                    "rounded-full px-2 py-0.5",
                                    "text-[10px] font-medium",
                                    getStatusClass(asset.status),
                                ].join(" ")}
                            >
                                {getStatusLabel(asset.status)}
                            </span>
                        </div>

                        <p className="mt-0.5 text-[10px] text-gray-500">
                            {asset.assetClass} ·{" "}
                            {asset.registrationNumber}
                        </p>
                    </div>

                    {/* ------------------------------------------------------ */}
                    {/* Header Actions                                          */}
                    {/* ------------------------------------------------------ */}

                    <div className="flex items-center gap-2">
                        {canAssign && (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleAssign}
                                className="h-9 border-[#FE5720] bg-[#FE5720] px-5 text-white hover:bg-[#e84e1d]"
                            >
                                Assign
                            </Button>
                        )}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Vehicle Information                                         */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Vehicle Information
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <InfoRow
                            label="Asset class"
                            value={asset.assetClass}
                        />

                        <InfoRow
                            label="Registration number"
                            value={asset.registrationNumber}
                        />

                        <InfoRow
                            label="Chassis number"
                            value={asset.chassisNumber}
                        />

                        <InfoRow
                            label="Model / year"
                            value={asset.modelYear}
                        />

                        <InfoRow
                            label="Odometer reading"
                            value={asset.odometerReading}
                        />

                        <InfoRow
                            label="Registration period"
                            value={`${asset.registrationStartDate} — ${asset.registrationEndDate}`}
                        />

                        <InfoRow
                            label="Insurance supplier"
                            value={asset.insuranceSupplier}
                        />

                        <InfoRow
                            label="Insurance premium"
                            value={asset.insurancePremium}
                        />

                        <InfoRow
                            label="Insurance period"
                            value={`${asset.insuranceStartDate} — ${asset.insuranceEndDate}`}
                        />

                        <InfoRow
                            label="Warranty period"
                            value={`${asset.warrantyStartDate} — ${asset.warrantyEndDate}`}
                        />

                        <InfoRow
                            label="Purchase invoice"
                            value={asset.purchaseInvoice}
                        />

                        <InfoRow
                            label="Notes"
                            value={asset.notes}
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* Assignment Information                                      */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="text-sm font-semibold text-gray-900">
                        Assignment
                    </h2>

                    <p className="mb-3 mt-0.5 text-[10px] text-gray-500">
                        Current client and lease contract information
                        for this vehicle.
                    </p>

                    {/* ------------------------------------------------------ */}
                    {/* No Active Contract                                      */}
                    {/* ------------------------------------------------------ */}

                    {!hasActiveContract ? (
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium text-gray-400">
                                    Lease contract
                                </span>

                                <span className="ml-auto text-[10px] font-medium text-gray-500">
                                    No active lease contract
                                </span>
                            </div>

                            <div className="mt-2 border-t border-gray-100 pt-2">
                                <p className="text-[10px] leading-4 text-gray-500">
                                    This vehicle is not currently
                                    assigned to an active lease
                                    contract.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* ---------------------------------------------------- */
                        /* Active Contract                                      */
                        /* ---------------------------------------------------- */

                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                            <InfoRow
                                label="Client"
                                value={
                                    asset.client?.name ?? "—"
                                }
                            />

                            <InfoRow
                                label="Lease contract"
                                value={
                                    asset.leaseContract
                                        ?.contractNumber ?? "—"
                                }
                            />

                            <InfoRow
                                label="Contract status"
                                value={
                                    asset.leaseContract?.status ??
                                    "—"
                                }
                            />

                            <InfoRow
                                label="Contract period"
                                value={
                                    asset.leaseContract
                                        ? `${asset.leaseContract.startDate} — ${asset.leaseContract.endDate}`
                                        : "—"
                                }
                            />

                            <InfoRow
                                label="Matching line"
                                value={
                                    asset.leaseContract
                                        ?.matchingLine ?? "—"
                                }
                            />

                            <InfoRow
                                label="Current allocation"
                                value={
                                    asset.leaseContract
                                        ? `${asset.leaseContract.allocated} of ${asset.leaseContract.total} allocated`
                                        : "—"
                                }
                            />

                            <div className="flex justify-end border-t border-gray-100 px-3 py-2">
                                <Button
                                    type="button"
                                    variant="neutral"
                                    onClick={handleViewContract}
                                    className="h-8 border-gray-300 bg-white px-4 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                    View Lease Contract
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                {/* ========================================================== */}
                {/* Footer                                                       */}
                {/* ========================================================== */}

                <div className="mt-4 border-t border-gray-200 pt-3">
                    <p className="text-[8px] leading-3 text-gray-400">
                        View only · Asset Assignment module. Vehicle
                        information is maintained through Fleet &amp;
                        Asset Management.
                    </p>
                </div>
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