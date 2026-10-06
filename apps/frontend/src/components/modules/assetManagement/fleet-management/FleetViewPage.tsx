"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";
import {
    fetchAssetRegisterVehicleApi,
    updateAssetRegisterVehicleStatusApi,
} from "@/lib/api/asset-register/vehicles";
import { formatAssetRegisterIsoDate } from "@/lib/api/asset-register/mappers";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type FleetStatus = "available" | "leased" | "workshop" | "sold";

type AccidentDamage = {
    dateOfIncident: string;
    description: string;
    repairCostEstimate: string;
    insuranceClaimReference: string;
    claimStatus: string;
};

type FleetAsset = {
    id: string;
    fleetCode: string;

    assetClass: string;

    /*
     * Vehicle selected from the vehicles connected
     * to the selected Asset Class.
     */
    vehicleName: string;

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

    status: FleetStatus;

    accidentDamage?: AccidentDamage;
};

/* -------------------------------------------------------------------------- */
/* Status Helpers                                                             */
/* -------------------------------------------------------------------------- */

const getStatusLabel = (status: FleetStatus) => {
    switch (status) {
        case "available":
            return "Available";

        case "leased":
            return "Leased";

        case "workshop":
            return "Workshop";

        case "sold":
            return "Sold";

        default:
            return status;
    }
};

const getStatusClass = (status: FleetStatus) => {
    switch (status) {
        case "available":
            return "bg-orange-50 text-[#FE5720]";

        case "leased":
            return "bg-blue-50 text-blue-700";

        case "workshop":
            return "bg-orange-50 text-orange-700";

        case "sold":
            return "bg-gray-100 text-gray-500";

        default:
            return "bg-gray-100 text-gray-500";
    }
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function FleetViewPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { token, organizationId, isLoading: isAuthLoading, permissions } =
        useAuth();

    const assetId = String(params.id);

    const canUpdate =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const detailQuery = useQuery({
        queryKey: ["asset-register", "vehicles", organizationId, assetId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterVehicleApi({
                token,
                organizationId,
                id: assetId,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const statusMutation = useMutation({
        mutationFn: async (input: {
            action: "activate" | "deactivate";
            reason?: string;
        }) => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return updateAssetRegisterVehicleStatusApi({
                token,
                organizationId,
                id: assetId,
                action: input.action,
                reason: input.reason,
            });
        },
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({
                queryKey: ["asset-register", "vehicles"],
            });
            setShowDeactivateModal(false);
            setDeactivateReason("");
            setDeactivateReasonError("");
            setShowActivateConfirm(false);
            showSuccessToast(
                variables.action === "activate"
                    ? "Fleet vehicle activated"
                    : "Fleet vehicle deactivated",
            );
        },
        onError: (error: Error) => {
            showErrorToast(error.message || "Could not update vehicle status");
        },
    });

    const [showDeactivateModal, setShowDeactivateModal] =
        useState(false);
    const [showActivateConfirm, setShowActivateConfirm] =
        useState(false);
    const [deactivateReason, setDeactivateReason] =
        useState("");
    const [deactivateReasonError, setDeactivateReasonError] =
        useState("");

    const asset: FleetAsset | undefined = detailQuery.data
        ? {
              id: detailQuery.data.id,
              fleetCode: detailQuery.data.fleetCode,
              assetClass: detailQuery.data.assetClassName,
              vehicleName: detailQuery.data.assetMasterName,
              registrationNumber: detailQuery.data.registrationNumber,
              odometerReading: `${detailQuery.data.odometer.toLocaleString("en-IN")} km`,
              registrationStartDate: formatAssetRegisterIsoDate(
                  detailQuery.data.registrationStartDate,
              ),
              registrationEndDate: formatAssetRegisterIsoDate(
                  detailQuery.data.registrationEndDate,
              ),
              modelYear: String(detailQuery.data.modelYear),
              chassisNumber: detailQuery.data.chassisNumber,
              insuranceSupplier: "—",
              insurancePremium: detailQuery.data.insurancePremium,
              insuranceStartDate: formatAssetRegisterIsoDate(
                  detailQuery.data.insuranceStartDate,
              ),
              insuranceEndDate: formatAssetRegisterIsoDate(
                  detailQuery.data.insuranceEndDate,
              ),
              warrantyStartDate: formatAssetRegisterIsoDate(
                  detailQuery.data.warrantyStartDate,
              ),
              warrantyEndDate: formatAssetRegisterIsoDate(
                  detailQuery.data.warrantyEndDate,
              ),
              purchaseInvoice: detailQuery.data.purchaseInvoiceId ?? "—",
              notes: detailQuery.data.specialNotes ?? "",
              status: detailQuery.data.operationalStatus as FleetStatus,
          }
        : undefined;

    const handleEdit = () => {
        if (!asset || !detailQuery.data?.isActive) return;
        router.push(`/asset-register/fleetregister/${asset.id}/edit`);
    };

    const handleDeactivate = () => {
        const reason = deactivateReason.trim();
        if (!reason) {
            setDeactivateReasonError("Reason is required.");
            return;
        }
        statusMutation.mutate({ action: "deactivate", reason });
    };

    const handleActivate = () => {
        statusMutation.mutate({ action: "activate" });
    };

    /* ---------------------------------------------------------------------- */
    /* Back                                                                   */
    /* ---------------------------------------------------------------------- */

    const handleBack = () => {
        router.push("/asset-register/fleetregister");
    };

    /* ---------------------------------------------------------------------- */
    /* Not Found                                                              */
    /* ---------------------------------------------------------------------- */

    if (detailQuery.isError) {
        return (
            <div className="min-h-full bg-gray-50 px-5 py-4 text-sm text-gray-500">
                Fleet vehicle not found.
            </div>
        );
    }

    if (isAuthLoading || detailQuery.isLoading || !asset) {
        return (
            <div className="min-h-full bg-gray-50 px-5 py-4 text-sm text-gray-500">
                Loading fleet vehicle…
            </div>
        );
    }

    const isInactive = !detailQuery.data?.isActive;

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

                        {/* Updated: Asset Class + Vehicle Name + Registration */}
                        <p className="mt-0.5 text-[10px] text-gray-500">
                            {asset.assetClass} · {asset.vehicleName} ·{" "}
                            {asset.registrationNumber}
                        </p>
                    </div>

                    {/* ====================================================== */}
                    {/* Actions                                                   */}
                    {/* ====================================================== */}

                    <div className="flex items-center gap-2">
                        {canUpdate && !isInactive ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleEdit}
                                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                            >
                                Edit
                            </Button>
                        ) : null}

                        {canUpdate && isInactive ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={() => setShowActivateConfirm(true)}
                                disabled={statusMutation.isPending}
                                className="h-9 border-[#FE5720] bg-white px-5 text-[#FE5720] hover:bg-orange-50"
                            >
                                Activate
                            </Button>
                        ) : canUpdate ? (
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
                        ) : null}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Vehicle Information                                          */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Vehicle Information
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                        {/* Asset class */}

                        <InfoRow
                            label="Asset class"
                            value={asset.assetClass}
                        />

                        {/* Vehicle name */}

                        <InfoRow
                            label="Vehicle name"
                            value={asset.vehicleName}
                        />

                        {/* Registration number */}

                        <InfoRow
                            label="Registration number"
                            value={asset.registrationNumber}
                        />

                        {/* Chassis number */}

                        <InfoRow
                            label="Chassis number"
                            value={asset.chassisNumber}
                        />

                        {/* Model / year */}

                        <InfoRow
                            label="Model / year"
                            value={asset.modelYear}
                        />

                        {/* Odometer */}

                        <InfoRow
                            label="Odometer reading"
                            value={asset.odometerReading}
                        />

                        {/* ================================================== */}
                        {/* Registration Period                                */}
                        {/* ================================================== */}

                        <InfoRow
                            label="Registration period"
                            value={`${asset.registrationStartDate} — ${asset.registrationEndDate}`}
                        />

                        {/* ================================================== */}
                        {/* Insurance Supplier                                 */}
                        {/* ================================================== */}

                        <InfoRow
                            label="Insurance supplier"
                            value={asset.insuranceSupplier}
                        />

                        {/* Insurance premium */}

                        <InfoRow
                            label="Insurance premium"
                            value={asset.insurancePremium}
                        />

                        {/* Insurance period */}

                        <InfoRow
                            label="Insurance period"
                            value={`${asset.insuranceStartDate} — ${asset.insuranceEndDate}`}
                        />

                        {/* ================================================== */}
                        {/* Warranty Period                                    */}
                        {/* ================================================== */}

                        <InfoRow
                            label="Warranty period"
                            value={`${asset.warrantyStartDate} — ${asset.warrantyEndDate}`}
                        />

                        {/* ================================================== */}
                        {/* Purchase                                           */}
                        {/* ================================================== */}

                        <InfoRow
                            label="Purchase invoice"
                            value={asset.purchaseInvoice}
                        />

                        {/* ================================================== */}
                        {/* Notes                                              */}
                        {/* ================================================== */}

                        <InfoRow
                            label="Notes"
                            value={asset.notes}
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* TCO                                                          */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="text-sm font-semibold text-gray-900">
                        TCO
                    </h2>

                    <p className="mb-3 mt-0.5 text-[10px] text-gray-500">
                        Running costs plus every Work Order raised against
                        this vehicle — summed unconditionally, no comparative
                        view.
                    </p>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">

                        <InfoRow
                            label="Purchase price"
                            value="Rs. 68,500"
                        />

                        <InfoRow
                            label="Insurance paid to date"
                            value="Rs. 9,600"
                        />

                        <InfoRow
                            label="14-Jun-2024 — Routine service"
                            value="Rs. 1,850"
                        />

                        <InfoRow
                            label="02-Feb-2025 — Tyre replacement (front)"
                            value="Rs. 2,100"
                        />

                        <InfoRow
                            label="20-Aug-2025 — Odometer sensor repair"
                            value="Rs. 950"
                        />

                        {/* TCO Total */}

                        <div className="flex min-h-[30px] items-center border-t border-gray-200 px-3">
                            <p className="w-1/2 text-[10px] font-semibold text-gray-700">
                                TCO
                            </p>

                            <p className="w-1/2 text-right text-[10px] font-bold text-gray-900">
                                Rs. 83,000
                            </p>
                        </div>
                    </div>
                </section>

                {/* ========================================================== */}
                {/* Accident & Damage                                           */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="text-sm font-semibold text-gray-900">
                        Accident &amp; Damage
                    </h2>

                    <p className="mb-3 mt-0.5 text-[10px] text-gray-500">
                        Read-only — logged and managed by Workshop.
                    </p>

                    {!asset.accidentDamage ? (
                        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                            <p className="text-[10px] text-gray-500">
                                No accident or damage recorded for this vehicle.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                            <InfoRow
                                label="Date of incident"
                                value={asset.accidentDamage.dateOfIncident}
                            />

                            <InfoRow
                                label="Description"
                                value={asset.accidentDamage.description}
                            />

                            <InfoRow
                                label="Repair cost estimate"
                                value={asset.accidentDamage.repairCostEstimate}
                            />

                            <InfoRow
                                label="Insurance claim reference"
                                value={
                                    asset.accidentDamage.insuranceClaimReference
                                }
                            />

                            <InfoRow
                                label="Claim status"
                                value={asset.accidentDamage.claimStatus}
                            />
                        </div>
                    )}
                </section>

                {/* ========================================================== */}
                {/* Driver                                                       */}
                {/* ========================================================== */}

                <section className="mt-4">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Driver
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <InfoRow
                            label="Assigned driver"
                            value="No driver assigned"
                        />

                        <InfoRow
                            label="Contact"
                            value="—"
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* Lease History                                               */}
                {/* ========================================================== */}

                <div className="mt-4 border-t border-gray-200 pt-3">
                    <Button
                        type="button"
                        variant="neutral"
                        onClick={() => {
                            router.push(
                                `/asset-register/fleetregister/${asset.id}/lease-history`,
                            );
                        }}
                        className="h-8 border-gray-300 bg-white px-4 text-xs text-gray-700 hover:bg-gray-50"
                    >
                        View Lease History
                    </Button>
                </div>

                {/* ========================================================== */}
                {/* Footer                                                       */}
                {/* ========================================================== */}

                <div className="mt-2 border-t border-gray-200 pt-2">
                    <p className="text-[8px] leading-3 text-gray-400">
                        View only · Fleet &amp; Asset Management module.
                        View, edit and deactivate require field-level
                        permissions. Accident &amp; Damage is managed by
                        Workshop.
                    </p>
                </div>
            </div>

            {/* ============================================================== */}
            {/* DEACTIVATE MODAL                                               */}
            {/* ============================================================== */}

            {showDeactivateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div
                        className="w-full max-w-[460px] rounded-lg bg-white p-5 shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deactivate-vehicle-title"
                    >
                        <div>
                            <h2
                                id="deactivate-vehicle-title"
                                className="text-sm font-semibold text-gray-900"
                            >
                                Deactivate this vehicle?
                            </h2>

                            <p className="mt-1 text-xs leading-5 text-gray-500">
                                This will deactivate{" "}
                                <span className="font-medium text-gray-700">
                                    &quot;{asset.fleetCode}&quot;
                                </span>{" "}
                                from the fleet register.
                            </p>
                        </div>

                        {/* ================================================== */}
                        {/* Reason                                               */}
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
                                    const value = event.target.value;

                                    setDeactivateReason(value);

                                    if (value.trim()) {
                                        setDeactivateReasonError("");
                                    }
                                }}
                                placeholder="Enter reason for deactivation..."
                                rows={3}
                                className={[
                                    "w-full resize-none rounded-md bg-white px-3 py-2",
                                    "text-xs text-gray-900 outline-none",
                                    "placeholder:text-gray-400",
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

                        {/* ================================================== */}
                        {/* Modal Actions                                       */}
                        {/* ================================================== */}

                        <div className="mt-5 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={() => {
                                    setShowDeactivateModal(false);
                                    setDeactivateReason("");
                                    setDeactivateReasonError("");
                                }}
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

            <ConfirmDialog
                open={showActivateConfirm}
                title="Activate fleet vehicle?"
                message={`${asset.fleetCode} will return to the active fleet register.`}
                confirmLabel="Activate"
                isConfirmPending={statusMutation.isPending}
                onClose={() => {
                    if (!statusMutation.isPending) {
                        setShowActivateConfirm(false);
                    }
                }}
                onConfirm={handleActivate}
            />
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