"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Users } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchOrganisationDriversApi,
  updateOrganisationDriverStatusApi,
  type OrganisationDriverListItem,
} from "@/lib/api/organisation/drivers";
import {
  DRIVER_STATUS_UPDATE_ERROR,
  showDriverActivatedToast,
  showDriverDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import {
  organisationDriverDetailHref,
  organisationDriverEditHref,
} from "@/lib/navigation/organisation-static-routes";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardContact from "@/components/dashboard/DashboardContact";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type UiDriverStatus = "active" | "inactive" | "license-expired";

type Driver = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  supplier: string;
  assignedVehicle?: string;
  status: UiDriverStatus;
  apiStatus: "active" | "inactive";
};

const DRIVERS_PAGE_SIZE = 10;

function isLicenseExpired(iso: string | undefined): boolean {
  if (!iso?.trim()) return false;
  const expiry = new Date(`${iso.trim()}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiry < today;
}

function toListRow(driver: OrganisationDriverListItem): Driver {
  const apiStatus = driver.status;
  const status: UiDriverStatus =
    apiStatus === "active" && isLicenseExpired(driver.licenseExpiry)
      ? "license-expired"
      : apiStatus;

  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry,
    supplier: driver.supplier,
    assignedVehicle: driver.assignedVehicle,
    status,
    apiStatus,
  };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function DriverRegisterPage() {
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
    status: "",
  });
  const [page, setPage] = useState(1);

  const [deactivateTarget, setDeactivateTarget] = useState<Driver | null>(
    null,
  );
  const [activateTarget, setActivateTarget] = useState<Driver | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status]);

  const driversQuery = useQuery({
    queryKey: [
      "organization",
      "drivers",
      organizationId,
      debouncedSearch,
      filters.status,
      page,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationDriversApi(token, {
        organizationId,
        page,
        pageSize: DRIVERS_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status:
          filters.status === "active" ||
          filters.status === "inactive" ||
          filters.status === "license-expired"
            ? filters.status
            : undefined,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const drivers = useMemo(
    () => (driversQuery.data?.items ?? []).map(toListRow),
    [driversQuery.data?.items],
  );
  const driversTotal = driversQuery.data?.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(driversTotal / DRIVERS_PAGE_SIZE),
  );

  const listHasFilters =
    debouncedSearch.trim().length > 0 || filters.status !== "";

  const isInitialLoading =
    isAuthLoading || (driversQuery.isLoading && !driversQuery.data);

  const statusMutation = useMutation({
    mutationFn: async (input: {
      driver: Driver;
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateOrganisationDriverStatusApi(
        token,
        organizationId,
        input.driver.id,
        { action: input.action, reason: input.reason },
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "drivers"],
      });
      setDeactivateTarget(null);
      setActivateTarget(null);
      setStatusError(null);
      if (variables.action === "activate") {
        showDriverActivatedToast(variables.driver.name);
      } else {
        showDriverDeactivatedToast(variables.driver.name);
      }
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message || DRIVER_STATUS_UPDATE_ERROR
          : error.message || DRIVER_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  const handleAddDriver = () => {
    if (!canCreate) return;
    router.push("/organization/driver-register/create");
  };

  const handleEdit = (driver: Driver) => {
    router.push(organisationDriverEditHref(driver.id));
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilters({
      status: "",
    });
  };

  const handleActivate = (driver: Driver) => {
    setStatusError(null);
    setActivateTarget(driver);
  };

  const handleDeactivate = (driver: Driver) => {
    setStatusError(null);
    setDeactivateTarget(driver);
  };

  const addDriverAction = canCreate ? (
    <Button type="button" onClick={handleAddDriver}>
      + Add Driver
    </Button>
  ) : undefined;

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
        <DashboardContact phone={driver.phone} email={driver.email} />
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

  if (isInitialLoading) {
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
        action={addDriverAction}
      >
        <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white">
          <p className="text-sm text-gray-500">Loading drivers...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (driversQuery.isError) {
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
        action={addDriverAction}
      >
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white">
          <p className="text-sm font-medium text-red-600">
            {driversQuery.error instanceof Error
              ? driversQuery.error.message
              : "Failed to load drivers."}
          </p>
          <button
            type="button"
            onClick={() => void driversQuery.refetch()}
            className="mt-2 text-sm text-gray-600 underline"
          >
            Try again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
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
        action={addDriverAction}
        pagination={
          driversTotal > DRIVERS_PAGE_SIZE
            ? {
                currentPage: page,
                totalPages,
                totalItems: driversTotal,
                pageSize: DRIVERS_PAGE_SIZE,
                onPageChange: setPage,
              }
            : undefined
        }
      >
        {(driversTotal > 0 || listHasFilters) && (
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

        {driversTotal === 0 && !listHasFilters ? (
          <DashboardEmptyState
            icon={
              <Users className="h-7 w-7" strokeWidth={1.4} />
            }
            title="No drivers added yet"
            description="Add your first driver to start managing your driver register."
            buttonLabel="Add Driver"
            onButtonClick={handleAddDriver}
          />
        ) : drivers.length === 0 ? (
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
          <DashboardTable
            columns={driverColumns}
            data={drivers}
            getRowKey={(driver) => driver.id}
            renderActions={(driver) => (
              <DashboardTableActions
                status={driver.apiStatus}
                locationId={driver.id}
                viewHref={organisationDriverDetailHref(driver.id)}
                onEdit={
                  canUpdate && driver.apiStatus === "active"
                    ? () => handleEdit(driver)
                    : undefined
                }
                onToggleStatus={
                  canUpdate
                    ? () =>
                        driver.apiStatus === "active"
                          ? handleDeactivate(driver)
                          : handleActivate(driver)
                    : undefined
                }
              />
            )}
          />
        )}
      </DashboardLayout>

      <ConfirmDialog
        open={activateTarget !== null}
        title="Activate driver?"
        message={
          activateTarget
            ? `${activateTarget.name} will be marked active in the driver register.`
            : ""
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
            driver: activateTarget,
            action: "activate",
          });
        }}
      />

      <ReasonRequiredDialog
        open={deactivateTarget !== null}
        title="Deactivate driver?"
        description={
          deactivateTarget ? (
            <>
              <span className="font-medium text-gray-900">
                {deactivateTarget.name}
              </span>{" "}
              will be marked inactive. Provide a reason — it is recorded in the
              audit log.
            </>
          ) : null
        }
        reasonLabel="Reason for deactivation"
        reasonPlaceholder="Reason for deactivation"
        confirmLabel="Deactivate"
        pendingLabel="Deactivating..."
        isPending={statusMutation.isPending}
        error={statusError}
        onClose={() => {
          if (!statusMutation.isPending) {
            setDeactivateTarget(null);
            setStatusError(null);
          }
        }}
        onConfirm={(reason) => {
          if (!deactivateTarget) return;
          statusMutation.mutate({
            driver: deactivateTarget,
            action: "deactivate",
            reason,
          });
        }}
      />
    </>
  );
}
