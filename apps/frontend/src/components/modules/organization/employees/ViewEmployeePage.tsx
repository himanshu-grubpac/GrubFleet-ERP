"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardSubpageHeader } from "@/components/dashboard/DashboardSubpageHeader";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationEmployeeByIdApi,
  updateOrganisationEmployeeStatusApi,
} from "@/lib/api/organisation/employees";
import { ApiClientError } from "@/lib/api/client";
import DeactivateEmployeeModal from "./DeactivateEmployeeModal";
import type { DeactivateReasonType, EmployeeRecord } from "./types";
import {
  DEACTIVATE_REASON_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from "./types";
import { formatEmployeeDisplayDate } from "./employeeDisplayUtils";
import {
  EMPLOYEE_STATUS_UPDATE_ERROR,
  showEmployeeActivatedToast,
  showEmployeeDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import { formatPhoneDisplay } from "@/lib/format/phone-format";

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function EmployeeDetailChrome({
  breadcrumbName,
  children,
}: {
  breadcrumbName?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <DashboardSubpageHeader
        backHref="/organization/employees"
        backLabel="Back to employees"
        currentLabel={breadcrumbName}
      />
      {children}
    </div>
  );
}

export default function ViewEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();
  const employeeId = params.id as string;

  const [deactivateOpen, setDeactivateOpen] = useState(false);
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
      setDeactivateOpen(false);
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

  const employee: EmployeeRecord | undefined = employeeQuery.data
    ? {
        id: employeeQuery.data.id,
        fullName: employeeQuery.data.fullName,
        designation: employeeQuery.data.designation,
        department: employeeQuery.data.department,
        location: employeeQuery.data.location,
        reportsToId: employeeQuery.data.reportsToId,
        reportsToName: employeeQuery.data.reportsToName,
        employmentType: employeeQuery.data.employmentType,
        dateOfJoining: employeeQuery.data.dateOfJoining,
        phone: employeeQuery.data.phone,
        email: employeeQuery.data.email,
        status: employeeQuery.data.status,
        deactivateReasonType: employeeQuery.data.deactivateReasonType as
          | DeactivateReasonType
          | undefined,
        deactivateComment: employeeQuery.data.deactivateComment ?? undefined,
      }
    : undefined;

  const handleActivate = () => {
    setStatusError(null);
    setActivateOpen(true);
  };

  const handleConfirmActivate = () => {
    statusMutation.mutate({ action: "activate" });
  };

  const handleConfirmDeactivate = (input: {
    reasonType: NonNullable<EmployeeRecord["deactivateReasonType"]>;
    comment?: string;
  }) => {
    setStatusError(null);
    statusMutation.mutate({
      action: "deactivate",
      reasonType: input.reasonType,
      comment: input.comment,
    });
  };

  if (isAuthLoading || employeeQuery.isLoading) {
    return (
      <EmployeeDetailChrome>
        <main className="px-6 py-3">
          <div
            className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500"
            aria-busy="true"
          >
            Loading employee...
          </div>
        </main>
      </EmployeeDetailChrome>
    );
  }

  if (employeeQuery.isError || !employee) {
    return (
      <EmployeeDetailChrome>
        <main className="px-6 py-3">
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-center">
            <p className="text-sm font-medium text-gray-700">
              Employee not found.
            </p>
            <Link
              href="/organization/employees"
              className="text-sm font-medium text-[#FE5720] hover:underline"
            >
              Back to employees
            </Link>
          </div>
        </main>
      </EmployeeDetailChrome>
    );
  }

  const isActive = employee.status === "active";
  const hasDeactivationDetails =
    !isActive &&
    (employee.deactivateReasonType || employee.deactivateComment?.trim());

  return (
    <EmployeeDetailChrome breadcrumbName={employee.fullName}>
      <main className="px-6 py-3 pb-8">
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
              aria-label={`Status: ${isActive ? "Active" : "Inactive"}`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isActive ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    router.push(`/organization/employees/${employee.id}/edit`)
                  }
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setStatusError(null);
                    setDeactivateOpen(true);
                  }}
                  disabled={statusMutation.isPending}
                >
                  Deactivate
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={handleActivate}
                disabled={statusMutation.isPending}
              >
                Activate
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField label="Designation" value={employee.designation || "—"} />
            <DetailField label="Department" value={employee.department || "—"} />
            <DetailField label="Location" value={employee.location || "—"} />
            <DetailField
              label="Employment type"
              value={EMPLOYMENT_TYPE_LABELS[employee.employmentType]}
            />
            <DetailField
              label="Date of joining"
              value={formatEmployeeDisplayDate(employee.dateOfJoining)}
            />
            <DetailField
              label="Phone"
              value={formatPhoneDisplay(employee.phone) || "—"}
            />
            <DetailField label="Email" value={employee.email || "—"} />
            <DetailField
              label="Reports to"
              value={employee.reportsToName ?? "—"}
            />
          </dl>

          {hasDeactivationDetails && (
            <div
              className="mt-6 flex gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
              role="status"
            >
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                aria-hidden
              />
              <div className="min-w-0 space-y-1">
                {employee.deactivateReasonType && (
                  <p>
                    <span className="font-medium text-gray-800">
                      Deactivation reason:
                    </span>{" "}
                    {DEACTIVATE_REASON_LABELS[employee.deactivateReasonType]}
                  </p>
                )}
                {employee.deactivateComment?.trim() && (
                  <p className="text-gray-600">{employee.deactivateComment}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={activateOpen}
        title="Activate employee?"
        message={`${employee.fullName} will be marked active in the register.`}
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateOpen(false);
          }
        }}
        onConfirm={handleConfirmActivate}
      />

      {deactivateOpen && (
        <DeactivateEmployeeModal
          employee={employee}
          isPending={statusMutation.isPending}
          error={statusError}
          onClose={() => {
            if (statusMutation.isPending) return;
            setDeactivateOpen(false);
            setStatusError(null);
          }}
          onDeactivate={handleConfirmDeactivate}
        />
      )}
    </EmployeeDetailChrome>
  );
}
