"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import EmployeeTableActions from "./EmployeeTableActions";
import DeactivateEmployeeModal from "./DeactivateEmployeeModal";
import { useAuth } from "@/providers/auth-provider";
import {
  dashboardCatalogQueryOptions,
  dashboardListQueryOptions,
} from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchOrganisationEmployeeDepartmentsApi,
  fetchOrganisationEmployeesApi,
  updateOrganisationEmployeeStatusApi,
  type OrganisationEmployeeListItem,
} from "@/lib/api/organisation/employees";
import {
  EMPLOYEE_STATUS_UPDATE_ERROR,
  showEmployeeActivatedToast,
  showEmployeeDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import { buildEmployeeDepartmentFilterOptions } from "./employeeDepartmentCatalog";
import { organisationEmployeeEditHref } from "@/lib/navigation/organisation-static-routes";
import type { DeactivateReasonType, EmployeeRecord } from "./types";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardContact from "@/components/dashboard/DashboardContact";

const EMPLOYEES_PAGE_SIZE = 10;

type Employee = {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  location: string;
  reportsTo?: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive";
};

function toListRow(employee: OrganisationEmployeeListItem): Employee {
  return {
    id: employee.id,
    employeeId: employee.id,
    name: employee.fullName,
    designation: employee.designation,
    department: employee.department,
    location: employee.location,
    reportsTo: employee.reportsToName ?? undefined,
    phone: employee.phone,
    email: employee.email,
    status: employee.status,
  };
}

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

export default function EmployeesPage() {
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

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
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
        pageSize: EMPLOYEES_PAGE_SIZE,
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
    () => (employeesQuery.data?.items ?? []).map(toListRow),
    [employeesQuery.data?.items],
  );
  const employeesTotal = employeesQuery.data?.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(employeesTotal / EMPLOYEES_PAGE_SIZE),
  );

  const departmentOptions = useMemo(
    () =>
      buildEmployeeDepartmentFilterOptions(
        departmentOptionsQuery.data?.items ?? [],
      ),
    [departmentOptionsQuery.data?.items],
  );

  const isInitialLoading =
    isAuthLoading ||
    (employeesQuery.isLoading && !employeesQuery.data);

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
    if (!canCreate) return;
    router.push("/organization/employees/create");
  };

  const handleEditEmployee = (employee: Employee) => {
    router.push(organisationEmployeeEditHref(employee.id));
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilters({
      department: "",
      status: "",
    });
  };

  const handleActivate = (employee: Employee) => {
    const source = employeesQuery.data?.items.find(
      (item) => item.id === employee.id,
    );
    if (!source) return;
    setStatusError(null);
    setActivateTarget(toEmployeeRecord(source));
  };

  const handleDeactivate = (employee: Employee) => {
    const source = employeesQuery.data?.items.find(
      (item) => item.id === employee.id,
    );
    if (!source) return;
    setStatusError(null);
    setDeactivateTarget(toEmployeeRecord(source));
  };

  const employeeColumns = [
    {
      key: "name",
      label: "NAME",
      render: (employee: Employee) => (
        <div>
          <p className="font-medium uppercase text-gray-900">
            {employee.name}
          </p>

          <p className="mt-0.5 text-xs text-gray-500">
            {employee.employeeId}
          </p>
        </div>
      ),
    },

    {
      key: "designation",
      label: "DESIGNATION",
    },

    {
      key: "department",
      label: "DEPARTMENT",
    },

    {
      key: "location",
      label: "LOCATION",
    },

    {
      key: "reportsTo",
      label: "REPORTS TO",
      render: (employee: Employee) => (
        <span className="text-sm uppercase text-gray-700">
          {employee.reportsTo || "—"}
        </span>
      ),
    },

    {
      key: "contact",
      label: "CONTACT",
      render: (employee: Employee) => (
        <DashboardContact
          phone={employee.phone}
          email={employee.email}
        />
      ),
    },

    {
      key: "status",
      label: "STATUS",
      render: (employee: Employee) => (
        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1",
            "text-xs font-medium",
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

  const addEmployeeAction = canCreate ? (
    <div className="flex items-center gap-2">
      <Button type="button" onClick={handleAddEmployee}>
        + Add Employee
      </Button>
    </div>
  ) : undefined;

  if (isInitialLoading) {
    return (
      <DashboardLayout
        title="Employees"
        description="This organisation's HR record — job details, performance, location, and reporting line for every employee."
        action={addEmployeeAction}
      >
        <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white">
          <p className="text-sm text-gray-500">Loading employees...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (employeesQuery.isError) {
    return (
      <DashboardLayout
        title="Employees"
        description="This organisation's HR record — job details, performance, location, and reporting line for every employee."
        action={addEmployeeAction}
      >
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white">
          <p className="text-sm font-medium text-red-600">
            Failed to load employees.
          </p>
          <button
            type="button"
            onClick={() => void employeesQuery.refetch()}
            className="mt-2 text-sm text-gray-600 underline"
          >
            Try again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Employees"
      description="This organisation's HR record — job details, performance, location, and reporting line for every employee."
      action={addEmployeeAction}
      pagination={
        employeesTotal > EMPLOYEES_PAGE_SIZE
          ? {
              currentPage: page,
              totalPages,
              totalItems: employeesTotal,
              pageSize: EMPLOYEES_PAGE_SIZE,
              onPageChange: setPage,
            }
          : undefined
      }
    >
      <DashboardFilters
        searchValue={search}
        searchPlaceholder="Search by name, designation, or department"
        onSearchChange={setSearch}
        selectFilters={[
          {
            key: "department",
            label: "Department",
            options: departmentOptions,
          },
          {
            key: "status",
            label: "Status",
            options: [
              {
                label: "Active",
                value: "active",
              },
              {
                label: "Inactive",
                value: "inactive",
              },
            ],
          },
        ]}
        filterValues={filters}
        onFilterChange={(key, value) => {
          setFilters((previous) => ({
            ...previous,
            [key]: value,
          }));
        }}
        onClear={handleClearFilters}
      />

      {employeesTotal === 0 ? (
        <DashboardEmptyState
          icon={<UserRound className="h-7 w-7" strokeWidth={1.4} />}
          title="No employees added yet"
          description="Add your first employee to this organisation."
          buttonLabel={canCreate ? "Add Employee" : undefined}
          onButtonClick={canCreate ? handleAddEmployee : undefined}
        />
      ) : employees.length === 0 ? (
        <DashboardEmptyState
          icon={<UserRound className="h-7 w-7" strokeWidth={1.4} />}
          title="No employees found"
          description="Try changing your search or filters."
          buttonLabel="Clear filters"
          onButtonClick={handleClearFilters}
        />
      ) : (
        <DashboardTable
          columns={employeeColumns}
          data={employees}
          getRowKey={(employee) => employee.id}
          renderActions={(employee) => (
            <EmployeeTableActions
              status={employee.status}
              employee={employee}
              onEdit={
                canUpdate && employee.status === "active"
                  ? () => handleEditEmployee(employee)
                  : undefined
              }
              onToggleStatus={
                canUpdate
                  ? () =>
                      employee.status === "active"
                        ? handleDeactivate(employee)
                        : handleActivate(employee)
                  : undefined
              }
            />
          )}
        />
      )}

      <ConfirmDialog
        open={activateTarget !== null}
        title="Activate employee?"
        message={
          activateTarget
            ? `${activateTarget.fullName} will be marked active in the employee register.`
            : "This employee will be marked active."
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateTarget(null);
            setStatusError(null);
          }
        }}
        onConfirm={() => {
          if (!activateTarget) return;
          statusMutation.mutate({
            employeeId: activateTarget.id,
            action: "activate",
          });
        }}
      />

      <DeactivateEmployeeModal
        employee={deactivateTarget}
        isPending={statusMutation.isPending}
        error={statusError}
        onClose={() => {
          if (!statusMutation.isPending) {
            setDeactivateTarget(null);
            setStatusError(null);
          }
        }}
        onDeactivate={(input) => {
          if (!deactivateTarget) return;
          statusMutation.mutate({
            employeeId: deactivateTarget.id,
            action: "deactivate",
            reasonType: input.reasonType,
            comment: input.comment,
          });
        }}
      />
    </DashboardLayout>
  );
}
