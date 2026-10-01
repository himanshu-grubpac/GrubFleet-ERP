"use client";

import { useMutation } from "@tanstack/react-query";

import DriverForm, {
  type DriverFormData,
} from "@/components/modules/organization/driver-register/DriverForm";
import { ApiClientError } from "@/lib/api/client";
import {
  buildDriverPayloadFromForm,
  createOrganisationDriverApi,
} from "@/lib/api/organisation/drivers";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

export type { DriverFormData } from "@/components/modules/organization/driver-register/DriverForm";

export default function CreateDriverPage() {
  const { token, organizationId } = useAuth();

  const createMutation = useMutation({
    mutationFn: async (form: DriverFormData) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return createOrganisationDriverApi(
        token,
        buildDriverPayloadFromForm({ organizationId, form }),
      );
    },
  });

  return (
    <DriverForm
      mode="create"
      onSaved={async (driver) => {
        try {
          await createMutation.mutateAsync(driver);
          showSuccessToast(`${driver.name.trim()} was added to the register`);
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
