"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Smartphone, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dashboardCatalogQueryOptions,
  dashboardListQueryOptions,
} from "@/lib/query/dashboard-list-query-options";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationEmployeeDepartmentsApi,
  fetchOrganisationEmployeesApi,
  updateOrganisationEmployeeStatusApi,
  type OrganisationEmployeeListItem,
} from "@/lib/api/organisation/employees";
import { buildEmployeeDepartmentFilterOptions } from "./employeeDepartmentCatalog";
import { ApiClientError } from "@/lib/api/client";

import DeactivateEmployeeModal from "./DeactivateEmployeeModal";
import ContactCopyIcon from "@/components/ui/ContactCopyIcon";
import EmployeeTableActions from "./EmployeeTableActions";
import { formatEmployeeRowCopyText } from "@/components/dashboard/dashboard-row-copy-text";
import type { DeactivateReasonType, EmployeeRecord } from "./types";
import {
  EMPLOYEES_ACTIVE_TAB,
  EMPLOYEES_DASHBOARD_TABS,
  EMPLOYEES_PAGE_DESCRIPTION,
} from "./employeeDashboardLayoutProps";
import {
  EMPLOYEE_STATUS_UPDATE_ERROR,
  showEmployeeActivatedToast,
  showEmployeeDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import {
  isDashboardCatalogEmptyState,
  shouldShowDashboardListFilters,
} from "@/lib/hooks/dashboard-list-search-ui";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";

function toEmployeeRecord(
  employee: OrganisationEmployeeListItem,
): EmployeeRecord {
  return {
    id: employee.id,
    fullName: employee.fullName,
    designation: employee.designation,
    department: employee.department,
    location: employee.location,
    reportsToId: employee.reportsToId,
    reportsToName: employee.reportsToName,
    employmentType: employee.employmentType,
    dateOfJoining: employee.dateOfJoining,
    phone: employee.phone,
    email: employee.email,
    status: employee.status,
  };
}

export default function DashboardEmployeesPage() {
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

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const { searchInput, setSearchInput, debouncedSearch } =
    useDashboardListSearch();
  const [filters, setFilters] = useState<Record<string, string>>({
    department: "",
    status: "",
  });
  const [page, setPage] = useState(1);

  const [deactivateTarget, setDeactivateTarget] =
    useState<EmployeeRecord | null>(null);
  const [activateTarget, setActivateTarget] =
    useState<EmployeeRecord | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.department, filters.status]);

  const departmentOptionsQuery = useQuery({
    queryKey: ["organization", "employees", organizationId, "departments"],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationEmployeeDepartmentsApi(token, organizationId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardCatalogQueryOptions,
  });

  const employeesQuery = useQuery({
    queryKey: [
      "organization",
      "employees",
      organizationId,
      debouncedSearch,
      filters.department,
      filters.status,
      page,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationEmployeesApi(token, {
        organizationId,
        page,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        department: filters.department || undefined,
        status:
          filters.status === "active" || filters.status === "inactive"
            ? filters.status
            : undefined,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const employees = useMemo(
    () => (employeesQuery.data?.items ?? []).map(toEmployeeRecord),
    [employeesQuery.data?.items],
  );
  const employeesTotal = employeesQuery.data?.total ?? 0;
  const employeesPage = employeesQuery.data?.page ?? page;

  const departmentOptions = useMemo(
    () =>
      buildEmployeeDepartmentFilterOptions(
        departmentOptionsQuery.data?.items ?? [],
      ),
    [departmentOptionsQuery.data?.items],
  );

  const statusMutation = useMutation({
    mutationFn: async (input: {
      employeeId: string;
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
        input.employeeId,
        {
          action: input.action,
          reasonType: input.reasonType,
          comment: input.comment,
        },
      );
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "employees"],
      });
      setActivateTarget(null);
      setDeactivateTarget(null);
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

  const handleAddEmployee = () => {
    router.push("/organization/employees/create");
  };

  const handleEdit = (employee: EmployeeRecord) => {
    router.push(`/organization/employees/${employee.id}/edit`);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setFilters({ department: "", status: "" });
  };

  const handleActivate = (employee: EmployeeRecord) => {
    setStatusError(null);
    setActivateTarget(employee);
  };

  const handleDeactivate = (employee: EmployeeRecord) => {
    setStatusError(null);
    setDeactivateTarget(employee);
  };

  const handleConfirmActivate = () => {
    if (!activateTarget) return;
    statusMutation.mutate({
      employeeId: activateTarget.id,
      action: "activate",
    });
  };

  const handleConfirmDeactivate = (input: {
    reasonType: NonNullable<EmployeeRecord["deactivateReasonType"]>;
    comment?: string;
  }) => {
    if (!deactivateTarget) return;
    setStatusError(null);
    statusMutation.mutate({
      employeeId: deactivateTarget.id,
      action: "deactivate",
      reasonType: input.reasonType,
      comment: input.comment,
    });
  };

  const employeeColumns = [
    {
      key: "fullName",
      label: "Name",
      render: (employee: EmployeeRecord) => (
        <span className="font-medium text-gray-900">{employee.fullName}</span>
      ),
    },
    {
      key: "designation",
      label: "Designation",
    },
    {
      key: "department",
      label: "Department",
    },
    {
      key: "location",
      label: "Location",
    },
    {
      key: "phone",
      label: "Mobile",
      render: (employee: EmployeeRecord) => (
        <ContactCopyIcon
          value={employee.phone}
          label="mobile number"
          icon={Smartphone}
          copyKind="phone"
        />
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (employee: EmployeeRecord) => (
        <ContactCopyIcon
          value={employee.email}
          label="email"
          icon={Mail}
        />
      ),
    },
    {
      key: "reportsToName",
      label: "Reports to",
      render: (employee: EmployeeRecord) =>
        employee.reportsToName ?? "—",
    },
    {
      key: "status",
      label: "Status",
      render: (employee: EmployeeRecord) => (
        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
            employee.status === "active"
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-500",
          ].join(" ")}
        >
          {employee.status === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  const addButton = canCreate ? (
    <Button type="button" onClick={handleAddEmployee}>
      + Add Employee
    </Button>
  ) : null;

  const isInitialLoading =
    isAuthLoading ||
    (employeesQuery.isLoading && !employeesQuery.data);

  if (isInitialLoading) {
    return (
      <DashboardLayout
        title="Employees"
        description={EMPLOYEES_PAGE_DESCRIPTION}
        tabs={[...EMPLOYEES_DASHBOARD_TABS]}
        activeTab={EMPLOYEES_ACTIVE_TAB}
        action={addButton}
      >
        <div
          className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white"
          aria-busy="true"
        >
          <p className="text-sm text-gray-500">Loading employees...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (employeesQuery.isError) {
    return (
      <DashboardLayout
        title="Employees"
        description={EMPLOYEES_PAGE_DESCRIPTION}
        tabs={[...EMPLOYEES_DASHBOARD_TABS]}
        activeTab={EMPLOYEES_ACTIVE_TAB}
        action={addButton}
      >
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-center">
          <p className="text-sm font-medium text-gray-700">
            Could not load employees.
          </p>
          <button
            type="button"
            onClick={() => void employeesQuery.refetch()}
            className="text-xs font-medium text-[#FE5720] hover:underline"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const hasActiveSelectFilters =
    filters.department !== "" || filters.status !== "";

  const hasAnyEmployees = shouldShowDashboardListFilters({
    total: employeesTotal,
    searchInput,
    debouncedSearch,
    hasActiveSelectFilters,
    isFetchingWithPlaceholder:
      employeesQuery.isFetching && employeesQuery.isPlaceholderData,
  });

  const isEmptyOrganisation = isDashboardCatalogEmptyState({
    total: employeesTotal,
    searchInput,
    debouncedSearch,
    hasActiveFilters: hasActiveSelectFilters,
    isFetching: employeesQuery.isFetching,
  });

  return (
    <DashboardLayout
      title="Employees"
      description={EMPLOYEES_PAGE_DESCRIPTION}
      tabs={[...EMPLOYEES_DASHBOARD_TABS]}
      activeTab={EMPLOYEES_ACTIVE_TAB}
      action={addButton}
    >
      {hasAnyEmployees && (
        <DashboardFilters
          searchValue={searchInput}
          searchPlaceholder="Search employees..."
          onSearchChange={setSearchInput}
          selectFilters={[
            {
              key: "department",
              label: "All departments",
              options: departmentOptions,
            },
            {
              key: "status",
              label: "All statuses",
              options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ],
            },
          ]}
          filterValues={filters}
          onFilterChange={(key, value) => {
            setFilters((previous) => ({ ...previous, [key]: value }));
          }}
          onClear={handleClearFilters}
        />
      )}

      {isEmptyOrganisation ? (
        <DashboardEmptyState
          icon={<UserRound className="h-7 w-7" strokeWidth={1.4} />}
          title="No employees added yet"
          description="Add your first employee."
          buttonLabel="Add Employee"
          onButtonClick={canCreate ? handleAddEmployee : undefined}
        />
      ) : employees.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
          <UserRound
            className="mb-3 h-7 w-7 text-gray-400"
            strokeWidth={1.4}
          />
          <h3 className="text-sm font-semibold text-gray-900">
            No employees found
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Try changing your search or filters.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div
            className={
              employeesQuery.isFetching && !isInitialLoading
                ? "opacity-60 transition-opacity"
                : undefined
            }
            aria-busy={employeesQuery.isFetching}
          >
            <DashboardTable
              columns={employeeColumns}
              data={employees}
              getRowKey={(employee) => employee.id}
              renderActions={(employee) => (
                <EmployeeTableActions
                  status={employee.status}
                  employeeId={employee.id}
                  copyText={formatEmployeeRowCopyText(employee)}
                  onEdit={
                    canUpdate ? () => handleEdit(employee) : undefined
                  }
                  onDeactivate={
                    canUpdate ? () => handleDeactivate(employee) : undefined
                  }
                  onActivate={
                    canUpdate ? () => handleActivate(employee) : undefined
                  }
                />
              )}
            />
          </div>

          <DashboardTablePagination
            page={employeesPage}
            pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
            total={employeesTotal}
            onPageChange={setPage}
            disabled={employeesQuery.isFetching || statusMutation.isPending}
          />
        </>
      )}

      <ConfirmDialog
        open={activateTarget !== null}
        title="Activate employee?"
        message={
          activateTarget
            ? `${activateTarget.fullName} will be marked active in the register.`
            : "This employee will be marked active in the register."
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateTarget(null);
          }
        }}
        onConfirm={handleConfirmActivate}
      />

      <DeactivateEmployeeModal
        employee={deactivateTarget}
        isPending={statusMutation.isPending}
        error={statusError}
        onClose={() => {
          if (statusMutation.isPending) return;
          setDeactivateTarget(null);
          setStatusError(null);
        }}
        onDeactivate={handleConfirmDeactivate}
      />
    </DashboardLayout>
  );
}
