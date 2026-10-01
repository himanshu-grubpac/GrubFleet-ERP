"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardContact from "@/components/dashboard/DashboardContact";

import { Users } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type DriverStatus = "active" | "inactive" | "license-expired";

type Driver = {
  id: string;

  /* Driver information */
  name: string;
  phone?: string;
  email?: string;

  /* License */
  licenseNumber: string;
  licenseExpiry?: string;

  /* Supplier */
  supplier: string;

  /* Vehicle */
  assignedVehicle?: string;

  /* Status */
  status: DriverStatus;
};

/* -------------------------------------------------------------------------- */
/* Mock data                                                                  */
/* -------------------------------------------------------------------------- */
/*
 * Replace this with your driver API later.
 *
 * phone + email are intentionally kept here so the same contact information
 * pattern can continue to be used.
 */

const mockDrivers: Driver[] = [
  {
    id: "DRV-001",
    name: "Yousif Abdullah Al-Mahmood",
    phone: "+971 50 123 4567",
    email: "yousif@example.com",
    licenseNumber: "DL-048231",
    licenseExpiry: "2027-04-18",
    supplier: "Horizon Fleet Staffing",
    assignedVehicle: "VH-1042",
    status: "active",
  },
  {
    id: "DRV-002",
    name: "Fatima Ahmed Al-Binali",
    phone: "+971 50 234 5678",
    email: "fatima@example.com",
    licenseNumber: "DL-055123",
    licenseExpiry: "2027-08-21",
    supplier: "Horizon Fleet Staffing",
    assignedVehicle: undefined,
    status: "inactive",
  },
  {
    id: "DRV-003",
    name: "Hassan Ebrahim Al-Doseri",
    phone: "+971 50 345 6789",
    email: "hassan@example.com",
    licenseNumber: "DL-061245",
    licenseExpiry: "2027-12-05",
    supplier: "Horizon Fleet Staffing",
    assignedVehicle: "VH-1058",
    status: "active",
  },
  {
    id: "DRV-004",
    name: "Mariam Juma Alawi",
    phone: "+971 50 456 7890",
    email: "mariam@example.com",
    licenseNumber: "DL-072310",
    licenseExpiry: "2027-02-11",
    supplier: "Horizon Fleet Staffing",
    assignedVehicle: undefined,
    status: "inactive",
  },
  {
    id: "DRV-005",
    name: "Khalid Mansoor Al-Saye",
    phone: "+971 50 567 8901",
    email: "khalid@example.com",
    licenseNumber: "DL-083412",
    licenseExpiry: "2028-01-15",
    supplier: "Zenith Driver Staffing Agency",
    assignedVehicle: "VH-1075",
    status: "active",
  },
  {
    id: "DRV-006",
    name: "Noor Salman Al-Kooheji",
    phone: "+971 50 678 9012",
    email: "noor@example.com",
    licenseNumber: "DL-094521",
    licenseExpiry: "2026-10-12",
    supplier: "Zenith Driver Staffing Agency",
    assignedVehicle: undefined,
    status: "inactive",
  },
  {
    id: "DRV-007",
    name: "Abdulla Rashid Al-Zayani",
    phone: "+971 50 789 0123",
    email: "abdulla@example.com",
    licenseNumber: "DL-105632",
    licenseExpiry: "2026-09-20",
    supplier: "Zenith Driver Staffing Agency",
    assignedVehicle: undefined,
    status: "inactive",
  },
  {
    id: "DRV-008",
    name: "Sara Ahmed Marhoon",
    phone: "+971 50 890 1234",
    email: "sara@example.com",
    licenseNumber: "DL-116742",
    licenseExpiry: "2028-03-10",
    supplier: "Zenith Driver Staffing Agency",
    assignedVehicle: "VH-1103",
    status: "active",
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function DriverRegisterPage() {
  const router = useRouter();

  /* ---------------------------------------------------------------------- */
  /* State                                                                  */
  /* ---------------------------------------------------------------------- */

  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<Record<string, string>>({
    status: "",
  });

  /* ---------------------------------------------------------------------- */
  /* Search + Filters                                                       */
  /* ---------------------------------------------------------------------- */

  const filteredDrivers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return mockDrivers.filter((driver) => {
      const matchesSearch =
        !searchValue ||
        driver.name.toLowerCase().includes(searchValue) ||
        driver.licenseNumber.toLowerCase().includes(searchValue) ||
        driver.supplier.toLowerCase().includes(searchValue) ||
        driver.assignedVehicle
          ?.toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        !filters.status ||
        driver.status === filters.status;

      return matchesSearch && matchesStatus;
    });
  }, [search, filters.status]);

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                             */
  /* ---------------------------------------------------------------------- */

  const handleAddDriver = () => {
    router.push("/organization/driver-register/create");
  };

  const handleView = (driver: Driver) => {
    router.push(`/organization/driver-register/${driver.id}`);
  };

  const handleEdit = (driver: Driver) => {
    router.push(`/organization/driver-register/${driver.id}/edit`);
  };

  /* ---------------------------------------------------------------------- */
  /* Copy                                                                    */
  /* ---------------------------------------------------------------------- */

  const handleCopy = async (driver: Driver) => {
    try {
      await navigator.clipboard.writeText(driver.id);

      console.log("Driver ID copied:", driver.id);
    } catch (error) {
      console.error("Failed to copy driver:", error);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Status                                                                  */
  /* ---------------------------------------------------------------------- */

  const handleToggleStatus = (driver: Driver) => {
    console.log(
      driver.status === "active"
        ? "Deactivate driver:"
        : "Activate driver:",
      driver.id,
    );

    // Connect your activate/deactivate API here.
  };

  /* ---------------------------------------------------------------------- */
  /* Clear Filters                                                           */
  /* ---------------------------------------------------------------------- */

  const handleClearFilters = () => {
    setSearch("");

    setFilters({
      status: "",
    });
  };

  /* ---------------------------------------------------------------------- */
  /* Table Columns                                                           */
  /* ---------------------------------------------------------------------- */

  const driverColumns = [
    {
      key: "name",
      label: "Driver",
    },

    {
      key: "licenseNumber",
      label: "License No.",
    },

    {
      key: "supplier",
      label: "Supplier",
    },
    {
      key: "contact",
      label: "Contact",
      render: (driver: Driver) => (
        <DashboardContact
          phone={driver.phone}
          email={driver.email}
        />
      ),
    },

    {
      key: "assignedVehicle",
      label: "Assigned Vehicle",
      render: (driver: Driver) => (
        <span className="text-sm text-gray-700">
          {driver.assignedVehicle || "—"}
        </span>
      ),
    },

    {
      key: "status",
      label: "Status",

      render: (driver: Driver) => {
        const statusClasses = {
          active: "bg-green-50 text-green-700",
          inactive: "bg-gray-100 text-gray-500",
          "license-expired": "bg-red-50 text-red-600",
        };

        const statusLabels = {
          active: "Active",
          inactive: "Inactive",
          "license-expired": "License expired",
        };

        return (
          <span
            className={[
              "inline-flex rounded-full px-2.5 py-1",
              "text-xs font-medium",
              statusClasses[driver.status],
            ].join(" ")}
          >
            {statusLabels[driver.status]}
          </span>
        );
      },
    },
  ];

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <DashboardLayout
      title="Driver Register"
      description="Manage drivers, licenses, suppliers, assignments, and driver status."
      tabs={[
        {
          label: "Drivers",
          href: "/organization/driver-register",
        },
      ]}
      activeTab="/organization/driver-register"
      action={
        <Button
          type="button"
          onClick={handleAddDriver}
        >
          + Add Driver
        </Button>
      }
    >
      {/* ---------------------------------------------------------------- */}
      {/* Filters                                                          */}
      {/* ---------------------------------------------------------------- */}

      {mockDrivers.length > 0 && (
        <DashboardFilters
          searchValue={search}
          searchPlaceholder="Search by driver name, CPR no., or license no."
          onSearchChange={setSearch}
          selectFilters={[
            {
              key: "status",
              label: "All",
              options: [
                {
                  label: "Active",
                  value: "active",
                },
                {
                  label: "Inactive",
                  value: "inactive",
                },
                {
                  label: "License expired",
                  value: "license-expired",
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
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Empty State                                                      */}
      {/* ---------------------------------------------------------------- */}

      {mockDrivers.length === 0 ? (
        <DashboardEmptyState
          icon={
            <Users
              className="h-7 w-7"
              strokeWidth={1.4}
            />
          }
          title="No drivers added yet"
          description="Add your first driver to start managing your driver register."
          buttonLabel="Add Driver"
          onButtonClick={handleAddDriver}
        />
      ) : filteredDrivers.length === 0 ? (
        /* ------------------------------------------------------------ */
        /* No search/filter results                                     */
        /* ------------------------------------------------------------ */

        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
          <Users
            className="mb-3 h-7 w-7 text-gray-400"
            strokeWidth={1.4}
          />

          <h3 className="text-sm font-semibold text-gray-900">
            No drivers found
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
        /* ------------------------------------------------------------ */
        /* Drivers Table                                                 */
        /* ------------------------------------------------------------ */

        <DashboardTable
          columns={driverColumns}
          data={filteredDrivers}
          getRowKey={(driver) => driver.id}
          renderActions={(driver) => (
            <DashboardTableActions
              status={
                driver.status === "active"
                  ? "active"
                  : "inactive"
              }
              locationId={driver.id}
              viewHref={`/organization/driver-register/${driver.id}`}
              onEdit={() => handleEdit(driver)}
              onToggleStatus={() =>
                handleToggleStatus(driver)
              }
            />


          )}
        />
      )}
    </DashboardLayout>
  );
}