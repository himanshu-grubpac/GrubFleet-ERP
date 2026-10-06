"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchAssetRegisterAssetClassApi,
  updateAssetRegisterAssetClassStatusApi,
} from "@/lib/api/asset-register/asset-classes";
import {
  assetClassDetailToFormData,
  mapAssetRegisterVehicleTypeToUiLabel,
} from "@/lib/api/asset-register/mappers";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AssetClassStatus = "active" | "inactive";

type AssetClass = {
    id: string;
    name: string;
    classCode: string;
    status: AssetClassStatus;
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
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AssetClassViewPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const canUpdate =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const assetClassId = String(params.id);

    const detailQuery = useQuery({
        queryKey: [
            "asset-register",
            "asset-class",
            organizationId,
            assetClassId,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterAssetClassApi({
                token,
                organizationId,
                id: assetClassId,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
    });

    const statusMutation = useMutation({
        mutationFn: async (input: {
            action: "activate" | "deactivate";
            reason?: string;
        }) => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return updateAssetRegisterAssetClassStatusApi({
                token,
                organizationId,
                id: assetClassId,
                action: input.action,
                reason: input.reason,
            });
        },
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({
                queryKey: ["asset-register", "asset-class"],
            });
            void queryClient.invalidateQueries({
                queryKey: ["asset-register", "asset-classes"],
            });
            setShowDeactivateModal(false);
            setDeactivateReason("");
            showSuccessToast(
                variables.action === "activate"
                    ? "Asset class activated"
                    : "Asset class deactivated",
            );
        },
        onError: (error: Error) => {
            showErrorToast(
                error.message || "Could not update asset class status",
            );
        },
    });

    const detail = detailQuery.data;
    const formData = detail ? assetClassDetailToFormData(detail) : null;
    const assetClass: AssetClass | null = detail
        ? {
              id: detail.id,
              name: detail.name,
              classCode: detail.code,
              status: detail.status,
              vehicleType: mapAssetRegisterVehicleTypeToUiLabel(
                  detail.vehicleType,
              ),
              fuelType: detail.fuelType,
              mileageFrom: formData?.mileageFrom ?? "",
              mileageTo: formData?.mileageTo ?? "",
              mileageUnit: formData?.mileageUnit ?? "",
              fuelTankCapacity: detail.fuelTankCapacity,
              ratedLoadCapacityFrom: detail.ratedLoadFrom,
              ratedLoadCapacityTo: detail.ratedLoadTo,
              defaultIntakeChecklist: detail.defaultIntakeChecklist,
              notes: detail.description ?? "",
          }
        : null;

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
        if (!assetClass || assetClass.status !== "active") return;
        router.push(
            `/asset-register/assestclass/${assetClass.id}/edit`,
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

        statusMutation.mutate({
            action: "deactivate",
            reason,
        });
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
    /* Activate                                                               */
    /* ---------------------------------------------------------------------- */

    const handleActivate = () => {
        statusMutation.mutate({ action: "activate" });
    };

    if (isAuthLoading || detailQuery.isLoading) {
        return (
            <div className="p-6 text-sm text-gray-500">
                Loading asset class…
            </div>
        );
    }

    if (detailQuery.isError || !assetClass) {
        return (
            <div className="p-6 text-sm text-gray-500">
                Asset class not found.
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Mileage                                                                */
    /* ---------------------------------------------------------------------- */

    const mileage =
        assetClass.mileageFrom ===
            assetClass.mileageTo
            ? `${assetClass.mileageFrom} ${assetClass.mileageUnit}`
            : `${assetClass.mileageFrom}–${assetClass.mileageTo} ${assetClass.mileageUnit}`;

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
                    {/* Asset Class Name + Status */}

                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {assetClass.name}
                            </h1>

                            {assetClass.status ===
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
                            Code: {assetClass.classCode}
                        </p>
                    </div>

                    {/* ====================================================== */}
                    {/* Actions                                                   */}
                    {/* ====================================================== */}

                    <div className="flex items-center gap-2">
                        {canUpdate &&
                        assetClass.status === "active" ? (
                        <Button
                            type="button"
                            variant="neutral"
                            onClick={handleEdit}
                            className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                        >
                            Edit
                        </Button>
                        ) : null}

                        {canUpdate &&
                        (assetClass.status ===
                            "active" ? (
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
                                onClick={
                                    handleActivate
                                }
                                className="h-9 border-[#FE5720] bg-white px-5 text-[#FE5720] hover:bg-orange-50"
                            >
                                Activate
                            </Button>
                        ))}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Specifications                                               */}
                {/* ========================================================== */}

                <section>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                        Specifications
                    </h2>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {/* Vehicle Type */}

                        <InfoRow
                            label="Vehicle type"
                            value={
                                assetClass.vehicleType
                            }
                        />

                        {/* Fuel Type */}

                        <InfoRow
                            label="Fuel type"
                            value={
                                assetClass.fuelType
                            }
                        />

                        {/* Mileage */}

                        <InfoRow
                            label="Mileage"
                            value={mileage}
                        />

                        {/* Fuel Tank Capacity */}

                        <InfoRow
                            label="Fuel tank capacity"
                            value={`${assetClass.fuelTankCapacity} L`}
                        />

                        {/* Rated Load Capacity */}
                        <InfoRow
                            label="Rated load capacity"
                            value={
                                assetClass.ratedLoadCapacityFrom ===
                                    assetClass.ratedLoadCapacityTo
                                    ? `${assetClass.ratedLoadCapacityFrom} kg`
                                    : `${assetClass.ratedLoadCapacityFrom}–${assetClass.ratedLoadCapacityTo} kg`
                            }
                        />

                        {/* Default Intake Checklist */}

                        <InfoRow
                            label="Default intake checklist"
                            value={
                                assetClass.defaultIntakeChecklist
                            }
                        />
                    </div>
                </section>

                {/* ========================================================== */}
                {/* Notes                                                        */}
                {/* ========================================================== */}

                {assetClass.notes && (
                    <section className="mt-4">
                        <h2 className="mb-3 text-sm font-semibold text-gray-900">
                            Notes
                        </h2>

                        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                            <p className="text-xs leading-5 text-gray-600">
                                {assetClass.notes}
                            </p>
                        </div>
                    </section>
                )}
            </div>

            {/* ============================================================= */}
            {/* DEACTIVATE MODAL                                                */}
            {/* ============================================================= */}

            {showDeactivateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div
                        className="w-full max-w-[460px] rounded-lg bg-white p-5 shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deactivate-asset-class-title"
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
                                    id="deactivate-asset-class-title"
                                    className="text-sm font-semibold text-gray-900"
                                >
                                    Deactivate this asset
                                    class?
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    This will deactivate{" "}
                                    <span className="font-medium text-gray-700">
                                        &quot;
                                        {
                                            assetClass.name
                                        }
                                        &quot;
                                    </span>{" "}
                                    from the asset class
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
                                value={
                                    deactivateReason
                                }
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