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
import DashboardContact from "@/components/dashboard/DashboardContact";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "employee-001",
    employeeId: "EMP-001",
    name: "Devraj Malhotra",
    designation: "Chief Operating Officer",
    department: "Leadership",
    location: "Andheri East Hub",
    reportsTo: undefined,
    phone: "+91 9876543201",
    email: "devraj@company.com",
    status: "active",
  },
  {
    id: "employee-002",
    employeeId: "EMP-002",
    name: "Rohan Kapoor",
    designation: "Fleet Ops Manager",
    department: "Fleet Operations",
    location: "Andheri East Hub",
    reportsTo: "Devraj Malhotra",
    phone: "+91 9876543210",
    email: "rohan@company.com",
    status: "active",
  },
  {
    id: "employee-003",
    employeeId: "EMP-003",
    name: "Arjun Mehta",
    designation: "Workshop Admin",
    department: "Workshop",
    location: "Bhandup Workshop",
    reportsTo: "Devraj Malhotra",
    phone: "+91 9876543211",
    email: "arjun@company.com",
    status: "active",
  },
  {
    id: "employee-004",
    employeeId: "EMP-004",
    name: "Neha Shah",
    designation: "Inventory Lead",
    department: "Inventory",
    location: "Bhiwandi Warehouse",
    reportsTo: "Devraj Malhotra",
    phone: "+91 9876543212",
    email: "neha@company.com",
    status: "active",
  },
  {
    id: "employee-005",
    employeeId: "EMP-005",
    name: "Priya Nair",
    designation: "HR Executive",
    department: "Human Resources",
    location: "Andheri East Hub",
    reportsTo: "Devraj Malhotra",
    phone: "+91 9876543213",
    email: "priya@company.com",
    status: "active",
  },
  {
    id: "employee-006",
    employeeId: "EMP-006",
    name: "Vikram Joshi",
    designation: "Workshop Technician",
    department: "Workshop",
    location: "Bhandup Workshop",
    reportsTo: "Arjun Mehta",
    phone: "+91 9876543214",
    email: "vikram@company.com",
    status: "active",
  },
  {
    id: "employee-007",
    employeeId: "EMP-007",
    name: "Meera Nair",
    designation: "Fleet Coordinator",
    department: "Fleet Operations",
    location: "Andheri East Hub",
    reportsTo: "Rohan Kapoor",
    phone: "+91 9876543215",
    email: "meera@company.com",
    status: "active",
  },
  {
    id: "employee-008",
    employeeId: "EMP-008",
    name: "Anita Desai",
    designation: "Inventory Executive",
    department: "Inventory",
    location: "Bhiwandi Warehouse",
    reportsTo: "Neha Shah",
    phone: "+91 9876543216",
    email: "anita@company.com",
    status: "active",
  },
  {
    id: "employee-009",
    employeeId: "EMP-009",
    name: "Kunal Verma",
    designation: "Workshop Technician",
    department: "Workshop",
    location: "Malad Workshop",
    reportsTo: "Arjun Mehta",
    phone: "+91 9876543217",
    email: "kunal@company.com",
    status: "inactive",
  },
  {
    id: "employee-010",
    employeeId: "EMP-010",
    name: "Aditya Rao",
    designation: "Fleet Coordinator",
    department: "Fleet Operations",
    location: "Powai Office Annexe",
    reportsTo: "Rohan Kapoor",
    phone: "+91 9876543218",
    email: "aditya@company.com",
    status: "active",
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function EmployeesPage() {
  const router = useRouter();

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<Record<string, string>>({
    department: "",
    status: "",
  });

  /* ------------------------------------------------------------------------ */
  /* Filter Data                                                              */
  /* ------------------------------------------------------------------------ */

  const filteredEmployees = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return MOCK_EMPLOYEES.filter((employee) => {
      const matchesSearch =
        !searchValue ||
        employee.name.toLowerCase().includes(searchValue) ||
        employee.employeeId.toLowerCase().includes(searchValue) ||
        employee.designation.toLowerCase().includes(searchValue) ||
        employee.department.toLowerCase().includes(searchValue) ||
        employee.location.toLowerCase().includes(searchValue) ||
        employee.reportsTo?.toLowerCase().includes(searchValue) ||
        employee.email?.toLowerCase().includes(searchValue) ||
        employee.phone?.toLowerCase().includes(searchValue);

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

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                               */
  /* ------------------------------------------------------------------------ */

  const handleAddEmployee = () => {
    router.push("/organization/employees/create");
  };

  const handleEditEmployee = (employee: Employee) => {
    router.push(
      `/organization/employees/${employee.id}/edit`,
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Status                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleToggleStatus = (employee: Employee) => {
    console.log(
      `${employee.status === "active"
        ? "Deactivate"
        : "Activate"
      } employee`,
      employee,
    );

    // Connect your activate/deactivate API here.
  };

  /* ------------------------------------------------------------------------ */
  /* Clear Filters                                                            */
  /* ------------------------------------------------------------------------ */

  const handleClearFilters = () => {
    setSearch("");

    setFilters({
      department: "",
      status: "",
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Table Columns                                                            */
  /* ------------------------------------------------------------------------ */

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
          {employee.status === "active"
            ? "Active"
            : "Inactive"}
        </span>
      ),
    },
  ];

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <DashboardLayout
      title="Employees"
      description="This organisation's HR record — job details, performance, location, and reporting line for every employee."
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
      {/* ------------------------------------------------------------------ */}
      {/* Filters                                                            */}
      {/* ------------------------------------------------------------------ */}

      <DashboardFilters
        searchValue={search}
        searchPlaceholder="Search by name, designation, or department"
        onSearchChange={setSearch}
        selectFilters={[
          {
            key: "department",
            label: "All departments",
            options: [
              {
                label: "Leadership",
                value: "Leadership",
              },
              {
                label: "Fleet Operations",
                value: "Fleet Operations",
              },
              {
                label: "Workshop",
                value: "Workshop",
              },
              {
                label: "Inventory",
                value: "Inventory",
              },
              {
                label: "Human Resources",
                value: "Human Resources",
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
        onClear={handleClearFilters}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Empty State                                                        */}
      {/* ------------------------------------------------------------------ */}

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

            handleClearFilters();
          }}
        />
      ) : (
        /* --------------------------------------------------------------- */
        /* Employee Table                                                  */
        /* --------------------------------------------------------------- */

        <DashboardTable
          columns={employeeColumns}
          data={filteredEmployees}
          getRowKey={(employee) => employee.id}
          renderActions={(employee) => (
            <EmployeeTableActions
              status={employee.status}
              employeeId={employee.id}
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