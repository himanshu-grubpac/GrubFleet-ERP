"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";
import {
  fetchAssetRegisterAssetMasterApi,
  updateAssetRegisterAssetMasterStatusApi,
} from "@/lib/api/asset-register/asset-masters";
import { mapAssetRegisterVehicleTypeToUiLabel } from "@/lib/api/asset-register/mappers";
import type { AssetRegisterVehicleTypeApi } from "@/lib/api/asset-register/asset-classes";

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
    const queryClient = useQueryClient();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const assetId = String(params.id);

    const canUpdate =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const detailQuery = useQuery({
        queryKey: ["asset-register", "asset-masters", organizationId, assetId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterAssetMasterApi({
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
            return updateAssetRegisterAssetMasterStatusApi({
                token,
                organizationId,
                id: assetId,
                action: input.action,
                reason: input.reason,
            });
        },
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({
                queryKey: ["asset-register", "asset-masters"],
            });
            setShowDeactivateModal(false);
            setDeactivateReason("");
            setDeactivateReasonError("");
            setShowActivateConfirm(false);
            showSuccessToast(
                variables.action === "activate"
                    ? "Asset master activated"
                    : "Asset master deactivated",
            );
        },
        onError: (error: Error) => {
            showErrorToast(error.message || "Could not update status");
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

    const asset: AssetMasterDetails | undefined = detailQuery.data
        ? {
              id: detailQuery.data.id,
              assetCode: detailQuery.data.assetClassCode,
              vehicleName: detailQuery.data.name,
              assetClass: detailQuery.data.assetClassName,
              vehicleType: mapAssetRegisterVehicleTypeToUiLabel(
                  detailQuery.data.classSpec
                      .vehicleType as AssetRegisterVehicleTypeApi,
              ),
              fuelType: detailQuery.data.classSpec.fuelType,
              mileageFrom: detailQuery.data.classSpec.mileageFrom ?? "",
              mileageTo: detailQuery.data.classSpec.mileageTo ?? "",
              mileageUnit: detailQuery.data.classSpec.mileageUnit ?? "",
              fuelTankCapacity: detailQuery.data.classSpec.fuelTankCapacity,
              ratedLoadCapacityFrom:
                  detailQuery.data.classSpec.ratedLoadFrom,
              ratedLoadCapacityTo: detailQuery.data.classSpec.ratedLoadTo,
              defaultIntakeChecklist: "",
              notes: "",
              status: detailQuery.data.isActive ? "Active" : "Inactive",
          }
        : undefined;

    const handleEdit = () => {
        if (!asset || asset.status !== "Active") {
            return;
        }
        router.push(`/asset-register/asset-master/${asset.id}/edit`);
    };

    const handleDeactivate = () => {
        const reason = deactivateReason.trim();
        if (!reason) {
            setDeactivateReasonError("Reason is required.");
            return;
        }
        statusMutation.mutate({ action: "deactivate", reason });
    };

    const handleCancelDeactivate = () => {
        if (statusMutation.isPending) return;
        setShowDeactivateModal(false);
        setDeactivateReason("");
        setDeactivateReasonError("");
    };

    if (detailQuery.isError) {
        return (
            <div className="min-h-full bg-gray-50">
                <div className="px-5 py-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <p className="text-sm text-gray-500">
                            Asset master not found.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (isAuthLoading || detailQuery.isLoading || !asset) {
        return (
            <div className="min-h-full bg-gray-50 px-5 py-4 text-sm text-gray-500">
                Loading asset master…
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

                        {canUpdate && asset.status === "Active" ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={handleEdit}
                                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                            >
                                Edit
                            </Button>
                        ) : null}

                        {canUpdate && asset.status === "Active" ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={() => {
                                    setDeactivateReason("");
                                    setDeactivateReasonError("");
                                    setShowDeactivateModal(true);
                                }}
                                disabled={statusMutation.isPending}
                                className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                            >
                                Deactivate
                            </Button>
                        ) : canUpdate ? (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={() => setShowActivateConfirm(true)}
                                disabled={statusMutation.isPending}
                                className="h-9 border-[#FE5720] bg-white px-5 text-[#FE5720] hover:bg-orange-50"
                            >
                                Activate
                            </Button>
                        ) : null}
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
                                disabled={statusMutation.isPending}
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
                title="Activate this asset?"
                message={`${asset.vehicleName} will be available for fleet register again.`}
                confirmLabel="Activate"
                isConfirmPending={statusMutation.isPending}
                onClose={() => {
                    if (!statusMutation.isPending) {
                        setShowActivateConfirm(false);
                    }
                }}
                onConfirm={() => {
                    statusMutation.mutate({ action: "activate" });
                }}
            />
        </div>
    );
}