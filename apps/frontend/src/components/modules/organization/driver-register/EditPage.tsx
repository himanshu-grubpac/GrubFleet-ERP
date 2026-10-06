"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import {
  buildDriverUpdatePayloadFromForm,
  driverDetailToFormData,
  fetchOrganisationDriverByIdApi,
  updateOrganisationDriverApi,
} from "@/lib/api/organisation/drivers";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";

import CreateDriverPage, {
  type DriverFormData,
} from "@/components/modules/organization/driver-register/CreateDriverPage";

export default function EditDriverPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const driverId = String(params.id);

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const driverQuery = useQuery({
    queryKey: ["organization", "drivers", organizationId, driverId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationDriverByIdApi(
        token,
        organizationId,
        driverId,
      );
    },
    enabled: !!token && !!organizationId && !isAuthLoading && !!driverId,
  });

  useEffect(() => {
    const detail = driverQuery.data;
    if (!detail) return;
    if (!detail.isActive || detail.status === "inactive") {
      router.replace(`/organization/driver-register/${driverId}`);
    }
  }, [driverQuery.data, driverId, router]);

  const initialData = useMemo(() => {
    if (!driverQuery.data) return undefined;
    return driverDetailToFormData(driverQuery.data);
  }, [driverQuery.data]);

  const handleCancel = () => {
    router.push(`/organization/driver-register/${driverId}`);
  };

  const handleSaved = async (data: DriverFormData) => {
    if (!token || !organizationId) {
      throw new Error("Missing auth context");
    }

    try {
      const updated = await updateOrganisationDriverApi(
        token,
        organizationId,
        driverId,
        buildDriverUpdatePayloadFromForm(data),
      );
      await queryClient.invalidateQueries({
        queryKey: ["organization", "drivers"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["organization", "drivers", organizationId, driverId],
      });
      showSuccessToast(`${updated.name} was updated`);
      router.push(`/organization/driver-register/${driverId}`);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Failed to save driver. Please try again.";
      showErrorToast(message);
      throw error;
    }
  };

  if (isAuthLoading || driverQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading driver...
      </div>
    );
  }

  if (!canUpdate) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        You do not have permission to edit drivers.
      </div>
    );
  }

  if (driverQuery.isError || !driverQuery.data || !initialData) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-red-600">
          {driverQuery.error instanceof ApiClientError
            ? driverQuery.error.message
            : "Driver not found."}
        </p>
        <button
          type="button"
          onClick={() => void driverQuery.refetch()}
          className="text-sm text-gray-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (
    !driverQuery.data.isActive ||
    driverQuery.data.status === "inactive"
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Redirecting...
      </div>
    );
  }

  return (
    <CreateDriverPage
      initialData={initialData}
      onCancel={handleCancel}
      onSaved={handleSaved}
    />
  );
}
