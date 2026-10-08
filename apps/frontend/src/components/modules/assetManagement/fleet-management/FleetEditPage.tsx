"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { assetRegisterFleetDetailHref } from "@/lib/navigation/asset-register-static-routes";
import { useAssetRegisterEntityId } from "@/lib/navigation/use-asset-register-entity-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import CreateFleetVehicleForm, {
  type FleetVehicleFormData,
} from "@/components/modules/assetManagement/fleet-management/FleetFormPage";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  FLEET_VEHICLE_SAVE_ERROR,
  showErrorToast,
  showFleetVehicleUpdatedToast,
} from "@/lib/toast/show-toast";
import {
  fetchAssetRegisterVehicleApi,
  updateAssetRegisterVehicleApi,
} from "@/lib/api/asset-register/vehicles";
import {
  fleetFormToUpdateVehiclePayload,
  vehicleDetailToFleetFormData,
} from "@/lib/api/asset-register/mappers";

export default function FleetEditPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

  const vehicleId = useAssetRegisterEntityId("vehicleId");

  const canUpdate =
    permissions.has("asset_register.update") ||
    permissions.has("asset_register.manage");

  const detailQuery = useQuery({
    queryKey: ["asset-register", "vehicles", organizationId, vehicleId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchAssetRegisterVehicleApi({
        token,
        organizationId,
        id: vehicleId,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const updateMutation = useMutation({
    mutationFn: async (form: FleetVehicleFormData) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateAssetRegisterVehicleApi({
        token,
        organizationId,
        id: vehicleId,
        body: fleetFormToUpdateVehiclePayload(form),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["asset-register", "vehicles"],
      });
      showFleetVehicleUpdatedToast();
      router.push(assetRegisterFleetDetailHref(vehicleId));
    },
    onError: (error: Error) => {
      showErrorToast(error.message || FLEET_VEHICLE_SAVE_ERROR);
    },
  });

  useEffect(() => {
    if (detailQuery.data && !detailQuery.data.isActive) {
      router.replace(assetRegisterFleetDetailHref(vehicleId));
    }
  }, [detailQuery.data, vehicleId, router]);

  if (!isAuthLoading && !canUpdate) {
    return (
      <div className="p-6 text-sm text-gray-500">
        You do not have permission to edit fleet vehicles.
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="p-6 text-sm text-gray-500">Fleet vehicle not found.</div>
    );
  }

  if (isAuthLoading || detailQuery.isLoading || !detailQuery.data) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading fleet vehicle…</div>
    );
  }

  if (!detailQuery.data.isActive) {
    return <div className="p-6 text-sm text-gray-500">Redirecting…</div>;
  }

  return (
    <CreateFleetVehicleForm
      mode="edit"
      initialData={vehicleDetailToFleetFormData(detailQuery.data)}
      onCancel={() => {
        router.push(assetRegisterFleetDetailHref(vehicleId));
      }}
      onSaved={async (data) => {
        await updateMutation.mutateAsync(data);
      }}
    />
  );
}
