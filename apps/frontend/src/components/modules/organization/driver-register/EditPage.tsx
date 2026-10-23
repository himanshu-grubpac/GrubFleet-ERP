"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOrganisationEntityId } from "@/lib/navigation/use-organisation-entity-id";
import {
  organisationDriverDetailHref,
} from "@/lib/navigation/organisation-static-routes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateDriverCaches } from "@/lib/query/invalidate-domain-caches";

import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import {
  buildDriverUpdatePayloadFromForm,
  driverDetailToFormData,
  fetchOrganisationDriverByIdApi,
  updateOrganisationDriverApi,
} from "@/lib/api/organisation/drivers";
import {
  DRIVER_SAVE_ERROR,
  showDriverUpdatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

import CreateDriverPage, {
  type DriverFormData,
} from "@/components/modules/organization/driver-register/CreateDriverPage";
import {
  LoadingState,
  RedirectingState,
} from "@/components/states/async-states";

export default function EditDriverPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const driverId = useOrganisationEntityId("driverId");

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
      navigateToEntityShell(router, organisationDriverDetailHref(driverId), driverId, 'replace');
    }
  }, [driverQuery.data, driverId, router]);

  const initialData = useMemo(() => {
    if (!driverQuery.data) return undefined;
    return driverDetailToFormData(driverQuery.data);
  }, [driverQuery.data]);

  const handleCancel = () => {
    navigateToEntityShell(router, organisationDriverDetailHref(driverId), driverId, 'push');
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
      await invalidateDriverCaches(queryClient);
      showDriverUpdatedToast(updated.name);
      navigateToEntityShell(router, organisationDriverDetailHref(driverId), driverId, 'push');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : DRIVER_SAVE_ERROR;
      showErrorToast(message);
      throw error;
    }
  };

  if (isAuthLoading || driverQuery.isLoading) {
    return (
      <div className="min-h-[40vh]">
        <LoadingState label="Loading driver…" />
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
    return <RedirectingState />;
  }

  return (
    <CreateDriverPage
      initialData={initialData}
      onCancel={handleCancel}
      onSaved={handleSaved}
    />
  );
}
