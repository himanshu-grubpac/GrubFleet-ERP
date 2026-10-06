"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import CreateEmployeePage, {
  type EmployeeFormData,
} from "@/components/modules/organization/employees/CreateEmployeePage";
import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchOrganisationEmployeeByIdApi,
  updateOrganisationEmployeeApi,
} from "@/lib/api/organisation/employees";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import {
  EMPLOYEE_SAVE_ERROR,
  showEmployeeUpdatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const employeeId = String(params.id);

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const employeeQuery = useQuery({
    queryKey: ["organization", "employee", organizationId, employeeId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationEmployeeByIdApi(
        token,
        organizationId,
        employeeId,
      );
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  useEffect(() => {
    const detail = employeeQuery.data;
    if (!detail) return;
    if (detail.status === "inactive") {
      router.replace(`/organization/employees/${employeeId}`);
    }
  }, [employeeQuery.data, employeeId, router]);

  const initialData = useMemo(() => {
    const detail = employeeQuery.data;
    if (!detail) return undefined;
    return {
      fullName: detail.fullName,
      designation: detail.designation,
      department: detail.department,
      locationId: detail.locationId ?? "",
      reportsToEmployeeId: detail.reportsToId ?? undefined,
      employmentType: detail.employmentType,
      dateOfJoining: detail.dateOfJoining,
      phone: detail.phone,
      email: detail.email,
    };
  }, [employeeQuery.data]);

  const handleCancel = () => {
    router.push(`/organization/employees/${employeeId}`);
  };

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
      const updated = await updateOrganisationEmployeeApi(
        token,
        organizationId,
        employeeId,
        {
          fullName: data.fullName,
          designation: data.designation,
          department: data.department,
          locationId: data.locationId,
          employmentType: data.employmentType,
          dateOfJoining: data.dateOfJoining,
          phone,
          email: data.email,
          reportsToEmployeeId: data.reportsToEmployeeId ?? null,
        },
      );
      await queryClient.invalidateQueries({
        queryKey: ["organization", "employees"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["organization", "employee", organizationId, employeeId],
      });
      showEmployeeUpdatedToast(updated.fullName);
      router.push(`/organization/employees/${employeeId}`);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : EMPLOYEE_SAVE_ERROR;
      showErrorToast(message);
      throw error;
    }
  };

  if (isAuthLoading || employeeQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading employee...
      </div>
    );
  }

  if (!canUpdate) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        You do not have permission to edit employees.
      </div>
    );
  }

  if (employeeQuery.isError || !employeeQuery.data || !initialData) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-red-600">
          {employeeQuery.error instanceof ApiClientError
            ? employeeQuery.error.message
            : "Employee not found."}
        </p>
        <button
          type="button"
          onClick={() => void employeeQuery.refetch()}
          className="text-sm text-gray-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (employeeQuery.data.status === "inactive") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Redirecting...
      </div>
    );
  }

  return (
    <CreateEmployeePage
      initialData={initialData}
      excludeEmployeeId={employeeId}
      onCancel={handleCancel}
      onSaved={handleSaved}
    />
  );
}
