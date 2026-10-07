"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  ASSET_MASTER_STATUS_UPDATE_ERROR,
  showAssetMasterActivatedToast,
  showAssetMasterDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import {
  fetchAssetRegisterAssetMasterApi,
  updateAssetRegisterAssetMasterStatusApi,
} from "@/lib/api/asset-register/asset-masters";
import { assetMasterDetailToFormData } from "@/lib/api/asset-register/mappers";

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
            setDeactivateOpen(false);
            setShowActivateConfirm(false);
            if (variables.action === "activate") {
                showAssetMasterActivatedToast();
            } else {
                showAssetMasterDeactivatedToast();
            }
        },
        onError: (error: Error) => {
            showErrorToast(
                error.message || ASSET_MASTER_STATUS_UPDATE_ERROR,
            );
        },
    });

    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [showActivateConfirm, setShowActivateConfirm] =
        useState(false);

    const detail = detailQuery.data;
    const hasClassSpec = !!detail?.classSpec;
    const mapped = detail ? assetMasterDetailToFormData(detail) : undefined;

    const asset: AssetMasterDetails | undefined = detail && mapped
        ? {
              id: detail.id,
              assetCode: detail.assetClassCode,
              vehicleName: detail.name,
              assetClass: detail.assetClassName,
              vehicleType: mapped.vehicleType,
              fuelType: mapped.fuelType,
              mileageFrom: mapped.mileageFrom,
              mileageTo: mapped.mileageTo,
              mileageUnit: mapped.mileageUnit,
              fuelTankCapacity: mapped.fuelTankCapacity,
              ratedLoadCapacityFrom: mapped.ratedLoadCapacityFrom,
              ratedLoadCapacityTo: mapped.ratedLoadCapacityTo,
              defaultIntakeChecklist: mapped.defaultIntakeChecklist,
              notes: mapped.notes,
              status: detail.isActive ? "Active" : "Inactive",
          }
        : undefined;

    const handleEdit = () => {
        if (!asset || asset.status !== "Active") {
            return;
        }
        router.push(`/asset-register/asset-master/${asset.id}/edit`);
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

    if (isAuthLoading || detailQuery.isLoading || !detail || !asset) {
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
                                onClick={() => setDeactivateOpen(true)}
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

                        {hasClassSpec ? (
                            <>
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
                                    value={asset.defaultIntakeChecklist}
                                />
                            </>
                        ) : (
                            <div className="border-b border-gray-100 px-4 py-3 last:border-b-0">
                                <p className="text-xs text-gray-500">
                                    Class specification is not available for
                                    this asset master.
                                </p>
                            </div>
                        )}

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

            <ReasonRequiredDialog
                open={deactivateOpen}
                title="Deactivate asset master?"
                description={
                    <>
                        <span className="font-medium text-gray-900">
                            {asset.vehicleName}
                        </span>{" "}
                        will no longer be available for fleet register.
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
                    statusMutation.mutate({ action: "deactivate", reason });
                }}
            />

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