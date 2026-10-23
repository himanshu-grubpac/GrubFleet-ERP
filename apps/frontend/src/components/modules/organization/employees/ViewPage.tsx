"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useRouter } from "next/navigation";
import { useOrganisationEntityId } from "@/lib/navigation/use-organisation-entity-id";
import { organisationEmployeeEditHref } from "@/lib/navigation/organisation-static-routes";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateEmployeeCaches } from "@/lib/query/invalidate-domain-caches";

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
import OrganizationViewLayout from "@/components/common/OrganizationViewLayout";
import {
  DashboardDetailErrorShell,
  DashboardPageLoadingShell,
} from "@/components/dashboard/dashboard-async-states";

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
      void invalidateEmployeeCaches(queryClient);
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
        <DashboardPageLoadingShell label="Loading employee…" />
      </div>
    );
  }

  if (employeeQuery.isError || !employeeQuery.data) {
    return (
      <div className="px-5 py-4">
        <DashboardDetailErrorShell
          title="Failed to load employee"
          error={employeeQuery.error}
          fallbackMessage="Employee not found."
          onRetry={() => void employeeQuery.refetch()}
        />
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
    navigateToEntityShell(router, organisationEmployeeEditHref(employee.id), employee.id, 'push');
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
    <OrganizationViewLayout>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-[15px] font-semibold text-gray-900">
              {employee.fullName}
            </h1>

            <span
              className={[
                "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500",
              ].join(" ")}
            >
              {isActive ? "Active" : "Deactivated"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canUpdate && isActive ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleEdit}
              >
                Edit
              </Button>
            ) : null}

            {canUpdate ? (
              isActive ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleOpenDeactivate}
                  className="h-9"
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleActivate}
                  className="h-9"
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
              label="WORKSHOP TECHNICIAN"
              value={detail.isWorkshopTechnician ? "Yes" : "No"}
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
    </OrganizationViewLayout>
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
      <p className="text-[12px] font-medium text-gray-400">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-800">{value}</p>
    </div>
  );
}
