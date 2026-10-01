"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DashboardSubpageHeader } from "@/components/dashboard/DashboardSubpageHeader";
import DriverForm, {
  type DriverFormData,
} from "@/components/modules/organization/driver-register/DriverForm";
import { driverDetailToFormData } from "@/components/modules/organization/driver-register/driverFormMappers";
import { ApiClientError } from "@/lib/api/client";
import {
  buildDriverUpdatePayloadFromForm,
  fetchOrganisationDriverByIdApi,
  updateOrganisationDriverApi,
} from "@/lib/api/organisation/drivers";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

export default function EditDriverPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const driverId = params.id as string;
  const [isRedirectingInactive, setIsRedirectingInactive] = useState(false);

  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const driverQuery = useQuery({
    queryKey: ["organization", "drivers", organizationId, driverId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationDriverByIdApi(token, organizationId, driverId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading && !!driverId,
    ...dashboardListQueryOptions,
  });

  const driver = driverQuery.data;

  useEffect(() => {
    if (!driver || driver.status === "active") {
      return;
    }
    setIsRedirectingInactive(true);
    router.replace(`/organization/driver-register/${driverId}`);
  }, [driver, driverId, router]);

  const updateMutation = useMutation({
    mutationFn: async (form: DriverFormData) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateOrganisationDriverApi(
        token,
        organizationId,
        driverId,
        buildDriverUpdatePayloadFromForm(form),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "drivers"],
      });
    },
  });

  if (driverQuery.isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <DashboardSubpageHeader
          backHref="/organization/driver-register"
          backLabel="Back to driver register"
        />
        <main className="px-6 py-8">
          <p className="text-sm text-gray-600" aria-busy="true">
            Loading driver…
          </p>
        </main>
      </div>
    );
  }

  if (driverQuery.isError || !driver) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <DashboardSubpageHeader
          backHref="/organization/driver-register"
          backLabel="Back to driver register"
        />
        <main className="px-6 py-8">
          <p className="text-sm text-red-600" role="alert">
            Driver not found.
          </p>
        </main>
      </div>
    );
  }

  if (driver.status !== "active" || isRedirectingInactive) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <DashboardSubpageHeader
          backHref={`/organization/driver-register/${driverId}`}
          backLabel="Back to driver"
          currentLabel={driver.name}
        />
        <main className="px-6 py-8">
          <p className="text-sm text-gray-600" aria-busy="true">
            Redirecting…
          </p>
          <Link
            href={`/organization/driver-register/${driverId}`}
            className="mt-4 inline-block text-sm font-medium text-[#FE5720] hover:underline"
          >
            Back to driver details
          </Link>
        </main>
      </div>
    );
  }

  const initialData = driverDetailToFormData(driver);

  return (
    <DriverForm
      mode="edit"
      driverId={driverId}
      initialData={initialData}
      onSaved={async (formData) => {
        try {
          await updateMutation.mutateAsync(formData);
          showSuccessToast(`${formData.name.trim()} was updated`);
        } catch (error) {
          const message =
            error instanceof ApiClientError
              ? error.message
              : "Failed to save driver. Please try again.";
          showErrorToast(message);
          throw error;
        }
      }}
    />
  );
}
