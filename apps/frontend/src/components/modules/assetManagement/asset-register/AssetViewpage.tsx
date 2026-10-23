"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assetRegisterAssetClassEditHref } from "@/lib/navigation/asset-register-static-routes";
import { useAssetRegisterEntityId } from "@/lib/navigation/use-asset-register-entity-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateAssetClassCaches } from "@/lib/query/invalidate-domain-caches";

import Button from "@/components/ui/GrubpacButton";
import {
  DashboardDetailErrorShell,
  DashboardPageLoadingShell,
} from "@/components/dashboard/dashboard-async-states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchAssetRegisterAssetClassApi,
  updateAssetRegisterAssetClassStatusApi,
} from "@/lib/api/asset-register/asset-classes";
import {
  formatMileageRangeFromSpec,
  formatRatedLoadRange,
  intakeChecklistItemsForDisplay,
  mapAssetRegisterVehicleTypeToUiLabel,
} from "@/lib/api/asset-register/mappers";
import {
  ASSET_CLASS_STATUS_UPDATE_ERROR,
  showAssetClassActivatedToast,
  showAssetClassDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

const EMPTY = "—";

export default function AssetClassViewPage() {
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

  const assetClassId = useAssetRegisterEntityId("assetClassId");

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
      void invalidateAssetClassCaches(queryClient);
      setDeactivateOpen(false);
      setActivateOpen(false);
      const displayName = detailQuery.data?.name ?? "Asset class";
      if (variables.action === "activate") {
        showAssetClassActivatedToast(displayName);
      } else {
        showAssetClassDeactivatedToast(displayName);
      }
    },
    onError: (error: Error) => {
      showErrorToast(error.message || ASSET_CLASS_STATUS_UPDATE_ERROR);
    },
  });

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);

  const handleEdit = () => {
    const detail = detailQuery.data;
    if (!detail || detail.status !== "active") return;
    navigateToEntityShell(router, assetRegisterAssetClassEditHref(detail.id), detail.id, 'push');
  };

  if (isAuthLoading || detailQuery.isLoading) {
    return (
      <div className="p-6">
        <DashboardPageLoadingShell label="Loading asset class…" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <DashboardDetailErrorShell
          title="Failed to load asset class"
          error={detailQuery.error}
          fallbackMessage="Asset class not found."
          onRetry={() => void detailQuery.refetch()}
        />
      </div>
    );
  }

  const detail = detailQuery.data;
  const isActive = detail.status === "active";
  const intakeItems = intakeChecklistItemsForDisplay(detail);
  const mileageDisplay = formatMileageRangeFromSpec(detail) || EMPTY;
  const ratedLoadDisplay =
    formatRatedLoadRange(detail.ratedLoadFrom, detail.ratedLoadTo) || EMPTY;
  const fuelTankDisplay = detail.fuelTankCapacity?.trim()
    ? `${detail.fuelTankCapacity} L`
    : EMPTY;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-5 py-4">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {detail.name}
              </h1>
              {isActive ? (
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[14px] font-medium text-[#FE5720]">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[14px] font-medium text-gray-500">
                  Inactive
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canUpdate && isActive ? (
              <Button
                type="button"
                variant="neutral"
                onClick={handleEdit}
                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Button>
            ) : null}

            {canUpdate ? (
              isActive ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setDeactivateOpen(true)}
                  className="h-9"
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActivateOpen(true)}
                  className="h-9"
                >
                  Activate
                </Button>
              )
            ) : null}
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Specifications
          </h2>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <InfoRow
              label="Vehicle type"
              value={mapAssetRegisterVehicleTypeToUiLabel(detail.vehicleType)}
            />
            <InfoRow label="Brand" value={detail.brand || EMPTY} />
            <InfoRow label="Model name" value={detail.modelName || EMPTY} />
            <InfoRow
              label="Manufacturing year"
              value={String(detail.manufacturingYear) || EMPTY}
            />
            <InfoRow label="Fuel type" value={detail.fuelType || EMPTY} />
            <InfoRow label="Fuel system" value={detail.fuelSystem || EMPTY} />
            <InfoRow label="Color" value={detail.color || EMPTY} />
            <InfoRow label="Color code" value={detail.colorCode || EMPTY} />
            <InfoRow
              label="CC (displacement)"
              value={
                detail.engineDisplacementCc
                  ? String(detail.engineDisplacementCc)
                  : EMPTY
              }
            />
            <InfoRow label="Mileage" value={mileageDisplay} />
            <InfoRow label="Rated load capacity" value={ratedLoadDisplay} />
            <InfoRow label="Fuel tank capacity" value={fuelTankDisplay} />
          </div>
        </section>

        <section className="mt-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Default intake checklist
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            {intakeItems.length > 0 ? (
              <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-5 text-gray-800">
                {intakeItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ) : (
              <p className="text-xs leading-5 text-gray-500">{EMPTY}</p>
            )}
          </div>
        </section>
      </div>

      <ReasonRequiredDialog
        open={deactivateOpen}
        title="Deactivate asset class?"
        description={
          <>
            <span className="font-medium text-gray-900">{detail.name}</span>{" "}
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
        message={`${detail.name} will be available for fleet register and lease lines.`}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[27px] items-center border-b border-gray-100 px-3 last:border-b-0">
      <p className="w-1/2 text-[12px] font-medium text-gray-400">{label}</p>
      <p className="w-1/2 text-right text-[12px] font-medium text-gray-800">
        {value}
      </p>
    </div>
  );
}

