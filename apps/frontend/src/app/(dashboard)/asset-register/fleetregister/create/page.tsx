"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import FleetFormPage, {
  type FleetVehicleFormData,
} from "@/components/modules/assetManagement/fleet-management/FleetFormPage";
import { useAuth } from "@/providers/auth-provider";
import {
  FLEET_VEHICLE_ADD_ERROR,
  showErrorToast,
  showFleetVehicleAddedToast,
} from "@/lib/toast/show-toast";
import { createAssetRegisterVehicleApi } from "@/lib/api/asset-register/vehicles";
import { fleetFormToCreateVehiclePayload } from "@/lib/api/asset-register/mappers";
import { assetRegisterFleetDetailHref } from "@/lib/navigation/asset-register-static-routes";

export default function FleetCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

  const canCreate =
    permissions.has("asset_register.create") ||
    permissions.has("asset_register.manage");

  const createMutation = useMutation({
    mutationFn: async (form: FleetVehicleFormData) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return createAssetRegisterVehicleApi({
        token,
        body: fleetFormToCreateVehiclePayload(organizationId, form),
      });
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({
        queryKey: ["asset-register", "vehicles"],
      });
      showFleetVehicleAddedToast();
      router.push(assetRegisterFleetDetailHref(created.id));
    },
    onError: (error: Error) => {
      showErrorToast(error.message || FLEET_VEHICLE_ADD_ERROR);
    },
  });

  if (!isAuthLoading && !canCreate) {
    return (
      <div className="p-6 text-sm text-gray-500">
        You do not have permission to add fleet vehicles.
      </div>
    );
  }

  return (
    <FleetFormPage
      onSaved={async (data) => {
        await createMutation.mutateAsync(data);
      }}
    />
  );
}
