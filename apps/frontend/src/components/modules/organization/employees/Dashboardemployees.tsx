"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import EmployeeTableActions from "./EmployeeTableActions";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Employee = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  role: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "employee-001",
    employeeId: "EMP-001",
    name: "Rohan Kapoor",
    department: "Operations",
    role: "Operations Manager",
    phone: "+91 9876543210",
    email: "rohan@company.com",
    status: "active",
  },
  {
    id: "employee-002",
    employeeId: "EMP-002",
    name: "Priya Nair",
    department: "Finance",
    role: "Finance Executive",
    phone: "+91 9876543211",
    email: "priya@company.com",
    status: "active",
  },
  {
    id: "employee-003",
    employeeId: "EMP-003",
    name: "Amit Sharma",
    department: "Workshop",
    role: "Workshop Supervisor",
    phone: "+91 9876543212",
    email: "amit@company.com",
    status: "inactive",
  },
  {
    id: "employee-004",
    employeeId: "EMP-004",
    name: "Neha Verma",
    department: "HR",
    role: "HR Executive",
    phone: "+91 9876543213",
    email: "neha@company.com",
    status: "active",
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function EmployeesPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<Record<string, string>>({
    department: "",
    status: "",
  });

  /* ---------------------------------------------------------------------- */
  /* Filter Data                                                            */
  /* ---------------------------------------------------------------------- */

  const filteredEmployees = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return MOCK_EMPLOYEES.filter((employee) => {
      const matchesSearch =
        !searchValue ||
        employee.name.toLowerCase().includes(searchValue) ||
        employee.employeeId.toLowerCase().includes(searchValue) ||
        employee.department.toLowerCase().includes(searchValue) ||
        employee.role.toLowerCase().includes(searchValue) ||
        employee.email.toLowerCase().includes(searchValue);

      const matchesDepartment =
        !filters.department ||
        employee.department === filters.department;

      const matchesStatus =
        !filters.status ||
        employee.status === filters.status;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus
      );
    });
  }, [search, filters]);

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                             */
  /* ---------------------------------------------------------------------- */

  const handleAddEmployee = () => {
    router.push("/organization/employees/create");
  };

  const handleEditEmployee = (employee: Employee) => {
    router.push(
      `/organization/employees/${employee.id}/edit`,
    );
  };

  const handleCopy = async (employee: Employee) => {
    try {
      await navigator.clipboard.writeText(employee.id);
    } catch (error) {
      console.error(
        "Failed to copy employee ID:",
        error,
      );
    }
  };

  const handleToggleStatus = (employee: Employee) => {
    console.log(
      `${employee.status === "active" ? "Deactivate" : "Activate"} employee`,
      employee,
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Table Columns                                                          */
  /* ---------------------------------------------------------------------- */

  const employeeColumns = [
    {
      key: "name",
      label: "Employee",
      render: (employee: Employee) => (
        <div>
          <p className="font-medium text-gray-900">
            {employee.name}
          </p>

          <p className="mt-0.5 text-xs text-gray-500">
            {employee.email}
          </p>
        </div>
      ),
    },

    {
      key: "employeeId",
      label: "Employee ID",
    },

    {
      key: "department",
      label: "Department",
    },

    {
      key: "role",
      label: "Role",
    },

    {
      key: "phone",
      label: "Phone",
    },

    {
      key: "status",
      label: "Status",
      render: (employee: Employee) => (
        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
            employee.status === "active"
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-500",
          ].join(" ")}
        >
          {employee.status === "active"
            ? "Active"
            : "Inactive"}
        </span>
      ),
    },
  ];

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <DashboardLayout
      title="Employees"
      description="This organisation's HR record — job details, performance, location, reporting line for every employee."
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleAddEmployee}
          >
            + Add Employee
          </Button>
        </div>
      }
    >
      {/* ---------------------------------------------------------------- */}
      {/* Filters                                                          */}
      {/* ---------------------------------------------------------------- */}

      <DashboardFilters
        searchValue={search}
        searchPlaceholder="Search employees..."
        onSearchChange={setSearch}
        selectFilters={[
          {
            key: "department",
            label: "All departments",
            options: [
              {
                label: "Operations",
                value: "Operations",
              },
              {
                label: "Finance",
                value: "Finance",
              },
              {
                label: "Workshop",
                value: "Workshop",
              },
              {
                label: "HR",
                value: "HR",
              },
            ],
          },

          {
            key: "status",
            label: "All statuses",
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
        onClear={() => {
          setSearch("");

          setFilters({
            department: "",
            status: "",
          });
        }}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Empty State                                                      */}
      {/* ---------------------------------------------------------------- */}

      {filteredEmployees.length === 0 ? (
        <DashboardEmptyState
          icon={
            <UserRound
              className="h-7 w-7"
              strokeWidth={1.4}
            />
          }
          title={
            MOCK_EMPLOYEES.length === 0
              ? "No employees added yet"
              : "No employees found"
          }
          description={
            MOCK_EMPLOYEES.length === 0
              ? "Add your first employee to this organisation."
              : "Try changing your search or filters."
          }
          buttonLabel={
            MOCK_EMPLOYEES.length === 0
              ? "Add Employee"
              : "Clear filters"
          }
          onButtonClick={() => {
            if (MOCK_EMPLOYEES.length === 0) {
              handleAddEmployee();
              return;
            }

            setSearch("");

            setFilters({
              department: "",
              status: "",
            });
          }}
        />
      ) : (
        /* ------------------------------------------------------------ */
        /* Employee Table                                                */
        /* ------------------------------------------------------------ */


        <DashboardTable
          columns={employeeColumns}
          data={filteredEmployees}
          getRowKey={(employee) => employee.id}
          renderActions={(employee) => (
            <EmployeeTableActions
              status={employee.status}
              onCopy={() => handleCopy(employee)}
              onEdit={() => handleEditEmployee(employee)}
              onToggleStatus={() =>
                handleToggleStatus(employee)
              }
            />
          )}
        />
      )}
    </DashboardLayout>
  );
}