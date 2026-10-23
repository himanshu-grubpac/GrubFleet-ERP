"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEmployeeCaches } from "@/lib/query/invalidate-domain-caches";

import CreateEmployeePage, {
  type EmployeeFormData,
} from "@/components/modules/organization/employees/CreateEmployeePage";
import { useAuth } from "@/providers/auth-provider";
import { createOrganisationEmployeeApi } from "@/lib/api/organisation/employees";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import { organisationEmployeeDetailHref } from "@/lib/navigation/organisation-static-routes";
import {
  EMPLOYEE_SAVE_ERROR,
  showApiErrorToast,
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
        isWorkshopTechnician: data.isWorkshopTechnician,
      });
      await invalidateEmployeeCaches(queryClient);
      showEmployeeCreatedToast(created.fullName);
      navigateToEntityShell(router, organisationEmployeeDetailHref(created.id), created.id, 'push');
    } catch (error) {
      showApiErrorToast(error, EMPLOYEE_SAVE_ERROR);
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
