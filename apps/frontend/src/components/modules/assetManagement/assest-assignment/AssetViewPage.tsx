"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AssignmentStatus =
    | "available"
    | "assigned"
    | "contract-required";

type LeaseContract = {
    id: string;
    contractNumber: string;
    clientName: string;
    status: "Active" | "Expired" | "Draft";
    startDate: string;
    endDate: string;
    matchingLine: string;
    allocated: number;
    total: number;
};

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

    leaseContracts?: LeaseContract[];
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

        leaseContracts: [
            {
                id: "contract-001",
                contractNumber: "LEASE-2026-0098",
                clientName: "Silverline Distribution Co",
                status: "Active",
                startDate: "01-Sep-2026",
                endDate: "31-Aug-2028",
                matchingLine: "Petrol Scooter — Standard",
                allocated: 11,
                total: 14,
            },
            {
                id: "contract-002",
                contractNumber: "LEASE-2026-0112",
                clientName: "ABC Logistics",
                status: "Active",
                startDate: "15-Sep-2026",
                endDate: "14-Sep-2028",
                matchingLine: "Petrol Scooter — Standard",
                allocated: 5,
                total: 10,
            },
            {
                id: "contract-003",
                contractNumber: "LEASE-2026-0135",
                clientName: "Metro Distribution",
                status: "Active",
                startDate: "01-Oct-2026",
                endDate: "30-Sep-2028",
                matchingLine: "Petrol Scooter — Standard",
                allocated: 7,
                total: 12,
            },
        ],
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

        leaseContracts: [],
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

        leaseContracts: [
            {
                id: "contract-008",
                contractNumber: "LEASE-2026-0142",
                clientName: "Northstar Retail Pvt Ltd",
                status: "Active",
                startDate: "01-Oct-2026",
                endDate: "30-Sep-2028",
                matchingLine: "Petrol Scooter — Standard",
                allocated: 3,
                total: 8,
            },
        ],
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getStatusLabel = (
    status: AssignmentStatus,
) => {
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

const getStatusClass = (
    status: AssignmentStatus,
) => {
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

    const assetFromMock = MOCK_ASSIGNMENT_ASSETS.find(
        (item) => item.id === assetId,
    );

    const [asset, setAsset] = useState<
        AssetAssignmentDetails | undefined
    >(assetFromMock);

    /* ---------------------------------------------------------------------- */
    /* Active contracts                                                       */
    /* ---------------------------------------------------------------------- */

    const activeLeaseContracts = useMemo(
        () =>
            asset?.leaseContracts?.filter(
                (contract) =>
                    contract.status === "Active",
            ) ?? [],
        [asset],
    );

    /* ---------------------------------------------------------------------- */
    /* Selected contract                                                      */
    /* ---------------------------------------------------------------------- */

    const [selectedLeaseContractId, setSelectedLeaseContractId] =
        useState(
            activeLeaseContracts[0]?.id ?? "",
        );

    const selectedLeaseContract =
        activeLeaseContracts.find(
            (contract) =>
                contract.id === selectedLeaseContractId,
        );

    /* ---------------------------------------------------------------------- */
    /* Assignment state                                                       */
    /* ---------------------------------------------------------------------- */

    const [isAssigned, setIsAssigned] =
        useState(false);

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                             */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        router.push(
            "/asset-register/asset-assign",
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Assign                                                                */
    /* ---------------------------------------------------------------------- */

    const handleAssign = () => {
        if (
            !asset ||
            !selectedLeaseContract
        ) {
            return;
        }

        /*
         * Mock assignment behaviour.
         *
         * Replace this section later with the
         * actual API request.
         */
        setAsset({
            ...asset,
            status: "assigned",
            client: {
                id: selectedLeaseContract.id,
                name: selectedLeaseContract.clientName,
            },
        });

        setIsAssigned(true);
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
                            onClick={handleCancel}
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
    /* UI                                                                     */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-full bg-gray-50">
            <div className="px-5 py-4">

                {/* ========================================================== */}
                {/* Page Header                                                 */}
                {/* ========================================================== */}

                <div className="mb-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Assign {asset.fleetCode}
                        </h1>

                        {isAssigned && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                Assigned
                            </span>
                        )}
                    </div>

                    <p className="mt-0.5 text-[10px] text-gray-500">
                        Allocates this vehicle to a lease
                        contract. This isn&apos;t be undone from
                        here once confirmed.
                    </p>
                </div>

                {/* ========================================================== */}
                {/* VEHICLE                                                     */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Vehicle
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <InfoRow
                            label="Asset class"
                            value={asset.assetClass}
                        />

                        <InfoRow
                            label="Registration number"
                            value={
                                asset.registrationNumber
                            }
                        />

                        <InfoRow
                            label="Odometer reading"
                            value={
                                asset.odometerReading
                            }
                        />

                        <InfoRow
                            label="Available since"
                            value={
                                asset.registrationStartDate
                            }
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* ASSIGN TO                                                    */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Assign To
                    </h2>

                    {/* ------------------------------------------------------ */}
                    {/* Lease Contract                                          */}
                    {/* ------------------------------------------------------ */}

                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
                        <label
                            htmlFor="lease-contract"
                            className="mb-1.5 block text-[10px] font-semibold text-gray-700"
                        >
                            Lease contract
                        </label>

                        {activeLeaseContracts.length ===
                            0 ? (
                            <div className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-xs text-gray-500">
                                No active lease contract
                                available
                            </div>
                        ) : (
                            <select
                                id="lease-contract"
                                value={
                                    selectedLeaseContractId
                                }
                                disabled={isAssigned}
                                onChange={(event) =>
                                    setSelectedLeaseContractId(
                                        event.target.value,
                                    )
                                }
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-800 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                            >
                                {activeLeaseContracts.map(
                                    (contract) => (
                                        <option
                                            key={
                                                contract.id
                                            }
                                            value={
                                                contract.id
                                            }
                                        >
                                            {
                                                contract.contractNumber
                                            }{" "}
                                            —{" "}
                                            {
                                                contract.clientName
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        )}
                    </div>

                    {/* ------------------------------------------------------ */}
                    {/* Selected Contract Information                          */}
                    {/* ------------------------------------------------------ */}

                    {selectedLeaseContract && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
                            <InfoRow
                                label="Matching line"
                                value={
                                    selectedLeaseContract.matchingLine
                                }
                            />

                            <div className="flex min-h-[27px] items-center border-b border-gray-100 px-3 last:border-b-0">
                                <p className="w-1/2 text-[10px] font-medium text-gray-400">
                                    Current allocation
                                </p>

                                <p className="w-1/2 text-right text-[10px] font-semibold text-[#FE5720]">
                                    {
                                        selectedLeaseContract.allocated
                                    }{" "}
                                    of{" "}
                                    {
                                        selectedLeaseContract.total
                                    }{" "}
                                    allocated
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* ========================================================== */}
                {/* ACTIONS                                                      */}
                {/* ========================================================== */}

                <div className="mt-4 flex items-center gap-2">
                    {/* Cancel */}
                    <Button
                        type="button"
                        variant="neutral"
                        onClick={handleCancel}
                        disabled={isAssigned}
                        className="h-8 border-gray-300 bg-white px-4 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </Button>

                    {/* Assign */}
                    <Button
                        type="button"
                        variant="neutral"
                        onClick={handleAssign}
                        disabled={
                            !selectedLeaseContract ||
                            isAssigned
                        }
                        className="h-8 border-[#FE5720] bg-[#FE5720] px-5 text-xs font-medium text-white hover:bg-[#E94E1C] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isAssigned
                            ? "Assigned"
                            : "Assign"}
                    </Button>
                </div>

                {/* ========================================================== */}
                {/* INFORMATION                                                  */}
                {/* ========================================================== */}

                <div className="mt-3 flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                    <span className="mt-0.5 shrink-0 text-[9px] font-medium text-[#FE5720]">
                        i
                    </span>

                    <p className="text-[9px] leading-3.5 text-gray-500">

                        Assignment is immediate — no approval
                        step. The vehicle moves to Leased and
                        stays on this contract; reassignment
                        isn&apos;t supported for MVP. Returns are
                        handled by Workshop and simply free the
                        vehicle up again.

                    </p>
                </div>

                {/* ========================================================== */}
                {/* SUCCESS MESSAGE                                              */}
                {/* ========================================================== */}

                {isAssigned && (
                    <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
                        <p className="text-[10px] font-medium text-[#FE5720]">
                            Vehicle assigned successfully to{" "}
                            {selectedLeaseContract?.contractNumber}{" "}
                            —{" "}
                            {selectedLeaseContract?.clientName}.
                        </p>
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