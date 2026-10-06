"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AssetMasterDetails = {
    id: string;

    assetCode: string;

    vehicleName: string;

    assetClass: string;

    vehicleType: string;

    fuelType: string;

    mileageFrom: string;
    mileageTo: string;
    mileageUnit: string;

    fuelTankCapacity: string;

    ratedLoadCapacityFrom: string;
    ratedLoadCapacityTo: string;

    defaultIntakeChecklist: string;

    notes: string;

    status: "Active" | "Inactive";
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/*                                                                            */
/* Replace this with your actual API/data source when available.              */
/* -------------------------------------------------------------------------- */

const MOCK_ASSET_MASTERS: AssetMasterDetails[] = [
    {
        id: "asset-001",
        assetCode: "AST-1001",
        vehicleName: "Activa 6G",
        assetClass: "Petrol Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Petrol",
        mileageFrom: "40",
        mileageTo: "50",
        mileageUnit: "km/L",
        fuelTankCapacity: "5.5",
        ratedLoadCapacityFrom: "150",
        ratedLoadCapacityTo: "250",
        defaultIntakeChecklist: "Standard Intake Checklist",
        notes: "Standard fleet vehicle.",
        status: "Active",
    },

    {
        id: "asset-002",
        assetCode: "AST-1002",
        vehicleName: "Activa 6G Black",
        assetClass: "Petrol Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Petrol",
        mileageFrom: "40",
        mileageTo: "50",
        mileageUnit: "km/L",
        fuelTankCapacity: "5.5",
        ratedLoadCapacityFrom: "150",
        ratedLoadCapacityTo: "250",
        defaultIntakeChecklist: "Standard Intake Checklist",
        notes: "Black variant of Activa 6G.",
        status: "Active",
    },

    {
        id: "asset-003",
        assetCode: "AST-1003",
        vehicleName: "Activa 6G White",
        assetClass: "Petrol Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Petrol",
        mileageFrom: "40",
        mileageTo: "50",
        mileageUnit: "km/L",
        fuelTankCapacity: "5.5",
        ratedLoadCapacityFrom: "150",
        ratedLoadCapacityTo: "250",
        defaultIntakeChecklist: "Standard Intake Checklist",
        notes: "White variant of Activa 6G.",
        status: "Active",
    },

    {
        id: "asset-004",
        assetCode: "AST-1004",
        vehicleName: "Tata 407",
        assetClass: "Diesel Truck — Heavy",
        vehicleType: "4-Wheeler",
        fuelType: "Diesel",
        mileageFrom: "6",
        mileageTo: "10",
        mileageUnit: "km/L",
        fuelTankCapacity: "60",
        ratedLoadCapacityFrom: "1000",
        ratedLoadCapacityTo: "5000",
        defaultIntakeChecklist: "Heavy Vehicle Intake Checklist",
        notes: "Heavy-duty commercial vehicle.",
        status: "Active",
    },

    {
        id: "asset-005",
        assetCode: "AST-1005",
        vehicleName: "Ola S1",
        assetClass: "Electric Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Electric",
        mileageFrom: "80",
        mileageTo: "120",
        mileageUnit: "km/kWh",
        fuelTankCapacity: "3",
        ratedLoadCapacityFrom: "100",
        ratedLoadCapacityTo: "180",
        defaultIntakeChecklist: "Standard Intake Checklist",
        notes: "Electric scooter asset.",
        status: "Active",
    },

    {
        id: "asset-006",
        assetCode: "AST-1006",
        vehicleName: "TVS iQube",
        assetClass: "Electric Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Electric",
        mileageFrom: "80",
        mileageTo: "120",
        mileageUnit: "km/kWh",
        fuelTankCapacity: "3",
        ratedLoadCapacityFrom: "100",
        ratedLoadCapacityTo: "180",
        defaultIntakeChecklist: "Standard Intake Checklist",
        notes: "Currently inactive asset.",
        status: "Inactive",
    },
];

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
        <div className="flex min-h-[38px] items-center border-b border-gray-100 px-4 last:border-b-0">
            <p className="w-1/2 text-xs font-medium text-gray-400">
                {label}
            </p>

            <p className="w-1/2 text-right text-xs font-medium text-gray-800">
                {value || "—"}
            </p>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AssetMasterViewPage() {
    const params = useParams();
    const router = useRouter();

    const assetId = String(params.id);

    /* ---------------------------------------------------------------------- */
    /* Asset                                                                  */
    /* ---------------------------------------------------------------------- */

    const assetFromMock = MOCK_ASSET_MASTERS.find(
        (item) => item.id === assetId,
    );

    const [asset, setAsset] = useState<
        AssetMasterDetails | undefined
    >(assetFromMock);

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
        if (!asset) {
            return;
        }

        router.push(
            `/asset-register/asset-master/${asset.id}/edit`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Deactivate                                                            */
    /* ---------------------------------------------------------------------- */

    const handleDeactivate = () => {
        if (!asset) {
            return;
        }

        const reason = deactivateReason.trim();

        if (!reason) {
            setDeactivateReasonError(
                "Reason is required.",
            );

            return;
        }

        setAsset((previous) => {
            if (!previous) {
                return previous;
            }

            return {
                ...previous,
                status: "Inactive",
            };
        });

        console.log("Asset deactivated:", {
            assetId: asset.id,
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
        if (!asset) {
            return;
        }

        setAsset((previous) => {
            if (!previous) {
                return previous;
            }

            return {
                ...previous,
                status: "Active",
            };
        });

        console.log("Asset activated:", asset.id);
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
                            Please create the Asset Class first before creating an Asset Master.
                        </p>
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
                {/* HEADER                                                       */}
                {/* ========================================================== */}

                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {asset.vehicleName}
                            </h1>

                            {asset.status === "Active" ? (
                                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-medium text-[#FE5720]">
                                    Active
                                </span>
                            ) : (
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-500">
                                    Inactive
                                </span>
                            )}
                        </div>

                        <p className="mt-1 text-xs text-gray-500">
                            {asset.assetCode}
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

                        {asset.status === "Active" ? (
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
                {/* VEHICLE INFORMATION                                         */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Vehicle information
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                        <InfoRow
                            label="Asset code"
                            value={asset.assetCode}
                        />

                        <InfoRow
                            label="Vehicle name"
                            value={asset.vehicleName}
                        />

                        <InfoRow
                            label="Asset class"
                            value={asset.assetClass}
                        />

                        <InfoRow
                            label="Vehicle type"
                            value={asset.vehicleType}
                        />

                        <InfoRow
                            label="Fuel type"
                            value={asset.fuelType}
                        />

                        <InfoRow
                            label="Mileage"
                            value={`${asset.mileageFrom}–${asset.mileageTo} ${asset.mileageUnit}`}
                        />

                        <InfoRow
                            label="Fuel tank capacity"
                            value={`${asset.fuelTankCapacity} L`}
                        />

                        <InfoRow
                            label="Rated load capacity"
                            value={`${asset.ratedLoadCapacityFrom}–${asset.ratedLoadCapacityTo} kg`}
                        />

                        <InfoRow
                            label="Default intake checklist"
                            value={
                                asset.defaultIntakeChecklist
                            }
                        />

                        <InfoRow
                            label="Status"
                            value={asset.status}
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* NOTES                                                        */}
                {/* ========================================================== */}

                <section className="mt-5">
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Notes
                    </h2>

                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                        <p className="whitespace-pre-wrap text-xs leading-5 text-gray-700">
                            {asset.notes ||
                                "No notes added."}
                        </p>
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
                        aria-labelledby="deactivate-asset-title"
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
                                    id="deactivate-asset-title"
                                    className="text-sm font-semibold text-gray-900"
                                >
                                    Deactivate this asset?
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    This will deactivate{" "}
                                    <span className="font-medium text-gray-700">
                                        &quot;
                                        {asset.vehicleName}
                                        &quot;
                                    </span>{" "}
                                    from the asset master
                                    register.
                                </p>
                            </div>
                        </div>

                        {/* Reason */}

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

                                    setDeactivateReason(
                                        value,
                                    );

                                    if (value.trim()) {
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

                        {/* Modal Actions */}

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