"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import CreateEmployeePage, {
  type EmployeeFormData,
} from "@/components/modules/organization/employees/CreateEmployeePage";
import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import { createOrganisationEmployeeApi } from "@/lib/api/organisation/employees";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import { organisationEmployeeDetailHref } from "@/lib/navigation/organisation-static-routes";
import {
  EMPLOYEE_SAVE_ERROR,
  showEmployeeCreatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

export default function CreatePage() {
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

  const handleSaved = async (data: EmployeeFormData) => {
    if (!token || !organizationId) {
      throw new Error("Missing auth context");
    }

    const phone = normalizePhoneForApi(data.phone);
    if (!phone) {
      showErrorToast(EMPLOYEE_SAVE_ERROR);
      throw new Error(EMPLOYEE_SAVE_ERROR);
    }

    try {
      const created = await createOrganisationEmployeeApi(token, {
        organizationId,
        fullName: data.fullName,
        designation: data.designation,
        department: data.department,
        locationId: data.locationId,
        employmentType: data.employmentType,
        dateOfJoining: data.dateOfJoining,
        phone,
        email: data.email,
        reportsToEmployeeId: data.reportsToEmployeeId,
      });
      await queryClient.invalidateQueries({
        queryKey: ["organization", "employees"],
      });
      showEmployeeCreatedToast(created.fullName);
      router.push(organisationEmployeeDetailHref(created.id));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : EMPLOYEE_SAVE_ERROR;
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
        You do not have permission to add employees.
      </div>
    );
  }

  return <CreateEmployeePage onSaved={handleSaved} />;
}
