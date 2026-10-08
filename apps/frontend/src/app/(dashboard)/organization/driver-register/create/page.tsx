"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import {
  buildDriverPayloadFromForm,
  createOrganisationDriverApi,
} from "@/lib/api/organisation/drivers";
import {
  DRIVER_SAVE_ERROR,
  showDriverCreatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import { organisationDriverDetailHref } from "@/lib/navigation/organisation-static-routes";

import CreateDriverPage, {
  type DriverFormData,
} from "@/components/modules/organization/driver-register/CreateDriverPage";

export default function CreateDriverRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canCreate =
    permissions.has("organisation.create") ||
    permissions.has("organisation.manage");

  const handleSaved = async (data: DriverFormData) => {
    if (!token || !organizationId) {
      throw new Error("Missing auth context");
    }

    try {
      const created = await createOrganisationDriverApi(
        token,
        buildDriverPayloadFromForm({ organizationId, form: data }),
      );
      await queryClient.invalidateQueries({
        queryKey: ["organization", "drivers"],
      });
      showDriverCreatedToast(created.name);
      router.push(organisationDriverDetailHref(created.id));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : DRIVER_SAVE_ERROR;
      showErrorToast(message);
      throw error;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        You do not have permission to add drivers.
      </div>
    );
  }

  return <CreateDriverPage onSaved={handleSaved} />;
}
