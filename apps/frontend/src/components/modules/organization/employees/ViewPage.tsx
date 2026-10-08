"use client";

import { useRouter } from "next/navigation";
import { useOrganisationEntityId } from "@/lib/navigation/use-organisation-entity-id";
import { organisationEmployeeEditHref } from "@/lib/navigation/organisation-static-routes";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import DeactivateEmployeeModal from "./DeactivateEmployeeModal";
import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchOrganisationEmployeeByIdApi,
  updateOrganisationEmployeeStatusApi,
} from "@/lib/api/organisation/employees";
import {
  EMPLOYEE_STATUS_UPDATE_ERROR,
  showEmployeeActivatedToast,
  showEmployeeDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import { EMPLOYMENT_TYPE_LABELS } from "./types";
import type { DeactivateReasonType, EmployeeRecord } from "./types";
import { formatEmployeeDateForForm } from "./employeeFormMappers";

export default function EmployeeViewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const employeeId = useOrganisationEntityId("employeeId");

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

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
    enabled: !!token && !!organizationId && !!employeeId && !isAuthLoading,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "deactivate";
      reasonType?: DeactivateReasonType;
      comment?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateOrganisationEmployeeStatusApi(
        token,
        organizationId,
        employeeId,
        input,
      );
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "employee", organizationId, employeeId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["organization", "employees"],
      });
      setActivateOpen(false);
      setShowDeactivateModal(false);
      setStatusError(null);
      if (variables.action === "activate") {
        showEmployeeActivatedToast(data.fullName);
      } else {
        showEmployeeDeactivatedToast(data.fullName);
      }
    },
    onError: (error) => {
      const message =
        error instanceof ApiClientError
          ? error.message || EMPLOYEE_STATUS_UPDATE_ERROR
          : EMPLOYEE_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  if (isAuthLoading || employeeQuery.isLoading) {
    return (
      <div className="px-5 py-4">
        <p className="text-sm text-gray-500">Loading employee...</p>
      </div>
    );
  }

  if (employeeQuery.isError || !employeeQuery.data) {
    return (
      <div className="px-5 py-4">
        <p className="text-sm text-gray-500">
          {employeeQuery.error instanceof ApiClientError
            ? employeeQuery.error.message
            : "Employee not found."}
        </p>
        <button
          type="button"
          onClick={() => void employeeQuery.refetch()}
          className="mt-2 text-sm text-gray-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const detail = employeeQuery.data;
  const isActive = detail.status === "active";

  const employee: EmployeeRecord = {
    id: detail.id,
    fullName: detail.fullName,
    designation: detail.designation,
    department: detail.department,
    location: detail.location,
    reportsToId: detail.reportsToId,
    reportsToName: detail.reportsToName,
    employmentType: detail.employmentType,
    dateOfJoining: detail.dateOfJoining,
    phone: detail.phone,
    email: detail.email,
    status: detail.status,
    deactivateReasonType: detail.deactivateReasonType as
      | DeactivateReasonType
      | undefined,
    deactivateComment: detail.deactivateComment ?? undefined,
  };

  const handleEdit = () => {
    if (!isActive || !canUpdate) return;
    router.push(organisationEmployeeEditHref(employee.id));
  };

  const handleOpenDeactivate = () => {
    setStatusError(null);
    setShowDeactivateModal(true);
  };

  const handleActivate = () => {
    setStatusError(null);
    setActivateOpen(true);
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-5 py-4">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">
              {employee.fullName}
            </h1>

            {isActive ? (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                Inactive
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canUpdate && isActive ? (
              <Button
                type="button"
                variant="neutral"
                onClick={handleEdit}
                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Button>
            ) : null}

            {canUpdate ? (
              isActive ? (
                <Button
                  type="button"
                  variant="neutral"
                  onClick={handleOpenDeactivate}
                  className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="neutral"
                  onClick={handleActivate}
                  className="h-9 border-[#FE5720] bg-white px-5 text-[#FE5720] hover:bg-orange-50"
                >
                  Activate
                </Button>
              )
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="grid grid-cols-4 gap-6">
            <InfoItem label="DESIGNATION" value={employee.designation} />
            <InfoItem label="DEPARTMENT" value={employee.department} />
            <InfoItem label="LOCATION" value={employee.location} />
            <InfoItem
              label="EMPLOYMENT TYPE"
              value={EMPLOYMENT_TYPE_LABELS[employee.employmentType]}
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-6 border-t border-gray-100 pt-3">
            <InfoItem
              label="DATE OF JOINING"
              value={
                employee.dateOfJoining
                  ? formatEmployeeDateForForm(employee.dateOfJoining)
                  : "—"
              }
            />
            <InfoItem label="PHONE" value={employee.phone} />
            <InfoItem label="EMAIL" value={employee.email} />
            <InfoItem
              label="REPORTS TO"
              value={employee.reportsToName || "—"}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={activateOpen}
        title="Activate employee?"
        message={`${employee.fullName} will be marked active in the employee register.`}
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateOpen(false);
            setStatusError(null);
          }
        }}
        onConfirm={() => {
          statusMutation.mutate({ action: "activate" });
        }}
      />

      <DeactivateEmployeeModal
        employee={showDeactivateModal ? employee : null}
        isPending={statusMutation.isPending}
        error={statusError}
        onClose={() => {
          if (!statusMutation.isPending) {
            setShowDeactivateModal(false);
            setStatusError(null);
          }
        }}
        onDeactivate={(input) => {
          statusMutation.mutate({
            action: "deactivate",
            reasonType: input.reasonType,
            comment: input.comment,
          });
        }}
      />
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-400">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-800">{value}</p>
    </div>
  );
}
