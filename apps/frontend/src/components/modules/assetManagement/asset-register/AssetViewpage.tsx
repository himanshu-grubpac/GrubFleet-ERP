"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchAssetRegisterAssetClassApi,
  updateAssetRegisterAssetClassStatusApi,
} from "@/lib/api/asset-register/asset-classes";
import {
  assetClassDetailToFormData,
  mapAssetRegisterVehicleTypeToUiLabel,
} from "@/lib/api/asset-register/mappers";
import {
  ASSET_CLASS_STATUS_UPDATE_ERROR,
  showAssetClassActivatedToast,
  showAssetClassDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

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
            setDeactivateOpen(false);
            setActivateOpen(false);
            const displayName =
                detailQuery.data?.name ?? "Asset class";
            if (variables.action === "activate") {
                showAssetClassActivatedToast(displayName);
            } else {
                showAssetClassDeactivatedToast(displayName);
            }
        },
        onError: (error: Error) => {
            showErrorToast(
                error.message || ASSET_CLASS_STATUS_UPDATE_ERROR,
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

    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [activateOpen, setActivateOpen] = useState(false);

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
                                onClick={() => setDeactivateOpen(true)}
                                className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                            >
                                Deactivate
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={() => setActivateOpen(true)}
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

            <ReasonRequiredDialog
                open={deactivateOpen}
                title="Deactivate asset class?"
                description={
                    <>
                        <span className="font-medium text-gray-900">
                            {assetClass.name}
                        </span>{" "}
                        will no longer be used for new vehicles or lease lines.
                    </>
                }
                reasonLabel="Reason for deactivation"
                confirmLabel="Deactivate"
                isPending={statusMutation.isPending}
                onClose={() => {
                    if (!statusMutation.isPending) {
                        setDeactivateOpen(false);
                    }
                }}
                onConfirm={(reason) => {
                    statusMutation.mutate({
                        action: "deactivate",
                        reason,
                    });
                }}
            />

            <ConfirmDialog
                open={activateOpen}
                title="Activate asset class?"
                message={`${assetClass.name} will be available for fleet register and lease lines.`}
                confirmLabel="Activate"
                isConfirmPending={statusMutation.isPending}
                onClose={() => {
                    if (!statusMutation.isPending) {
                        setActivateOpen(false);
                    }
                }}
                onConfirm={() => {
                    statusMutation.mutate({ action: "activate" });
                }}
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