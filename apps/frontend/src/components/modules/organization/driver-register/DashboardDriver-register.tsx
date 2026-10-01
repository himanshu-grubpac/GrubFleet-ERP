"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Smartphone, Users } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import {
  DRIVER_STATUS_UPDATE_ERROR,
  showDriverActivatedToast,
  showDriverDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchOrganisationDriversApi,
  updateOrganisationDriverStatusApi,
  type DriverStatus,
  type OrganisationDriverListItem,
} from "@/lib/api/organisation/drivers";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardViewCopyRowActions from "@/components/dashboard/DashboardViewCopyRowActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";

import ContactCopyIcon from "@/components/ui/ContactCopyIcon";
import DriverLicenseNumberCell from "@/components/modules/organization/driver-register/DriverLicenseNumberCell";

type Driver = OrganisationDriverListItem;

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

  const { searchInput, setSearchInput, debouncedSearch } =
    useDashboardListSearch();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const [deactivateTarget, setDeactivateTarget] = useState<Driver | null>(null);
  const [activateTarget, setActivateTarget] = useState<Driver | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const driversQuery = useQuery({
    queryKey: [
      "organization",
      "drivers",
      organizationId,
      debouncedSearch,
      statusFilter,
      page,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationDriversApi(token, {
        organizationId,
        page,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status:
          statusFilter === "active" ||
          statusFilter === "inactive" ||
          statusFilter === "license-expired"
            ? statusFilter
            : undefined,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const drivers = driversQuery.data?.items ?? [];
  const driversTotal = driversQuery.data?.total ?? 0;
  const driversPage = driversQuery.data?.page ?? page;

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
    router.push(`/organization/driver-register/${driver.id}/edit`);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setStatusFilter("");
  };

  const listHasFilters =
    debouncedSearch.trim().length > 0 || statusFilter !== "";

  const driverColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Driver",
        render: (driver: Driver) => (
          <span className="font-medium text-gray-900">{driver.name}</span>
        ),
      },
      {
        key: "licenseNumber",
        label: "License No.",
        render: (driver: Driver) => (
          <DriverLicenseNumberCell
            licenseNumber={driver.licenseNumber}
            licenseExpiry={driver.licenseExpiry}
          />
        ),
      },
      { key: "supplier", label: "Supplier" },
      {
        key: "email",
        label: "Email",
        render: (driver: Driver) => (
          <ContactCopyIcon
            value={driver.email ?? ""}
            label="email"
            icon={Mail}
          />
        ),
      },
      {
        key: "phone",
        label: "Mobile",
        render: (driver: Driver) => (
          <ContactCopyIcon
            value={driver.phone ?? ""}
            label="mobile number"
            icon={Smartphone}
            copyKind="phone"
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
          const statusClasses: Record<DriverStatus, string> = {
            active: "bg-green-50 text-green-700",
            inactive: "bg-gray-100 text-gray-500",
          };
          const statusLabels: Record<DriverStatus, string> = {
            active: "Active",
            inactive: "Inactive",
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
    ],
    [],
  );

  const addDriverAction = canCreate ? (
    <Button type="button" onClick={handleAddDriver}>
      + Add Driver
    </Button>
  ) : undefined;

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
      >
        <DashboardFilters
          searchValue={searchInput}
          searchPlaceholder="Search by driver name, CPR no., or license no."
          onSearchChange={setSearchInput}
          selectFilters={[
            {
              key: "status",
              label: "All",
              options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "License expired", value: "license-expired" },
              ],
            },
          ]}
          filterValues={{ status: statusFilter }}
          onFilterChange={(key, value) => {
            if (key === "status") {
              setStatusFilter(value);
            }
          }}
          onClear={handleClearFilters}
        />

        {isInitialLoading ? (
          <div
            className="min-h-[240px] animate-pulse rounded-lg bg-gray-100"
            aria-busy="true"
          />
        ) : driversQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {driversQuery.error instanceof Error
              ? driversQuery.error.message
              : "Failed to load drivers."}
            <button
              type="button"
              onClick={() => driversQuery.refetch()}
              className="ml-3 font-medium underline"
            >
              Retry
            </button>
          </div>
        ) : driversTotal === 0 && !listHasFilters ? (
          <DashboardEmptyState
            icon={<Users className="h-7 w-7" strokeWidth={1.4} />}
            title="No drivers added yet"
            description="Add your first driver to start managing your driver register."
            buttonLabel="Add Driver"
            onButtonClick={handleAddDriver}
          />
        ) : drivers.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
            <Users className="mb-3 h-7 w-7 text-gray-400" strokeWidth={1.4} />
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
          <>
            <DashboardTable
              columns={driverColumns}
              data={drivers}
              getRowKey={(driver) => driver.id}
              renderActions={(driver) => {
                const isActive = driver.status === "active";
                return (
                  <DashboardViewCopyRowActions
                    viewHref={`/organization/driver-register/${driver.id}`}
                    viewAriaLabel="View driver"
                    copyText={driver.id}
                    copyAriaLabel="Copy driver row details"
                    onEdit={
                      canUpdate && isActive
                        ? () => handleEdit(driver)
                        : undefined
                    }
                    menuAriaLabel="Driver actions"
                    status={driver.status}
                    onActivate={
                      canUpdate && !isActive
                        ? () => {
                            setStatusError(null);
                            setActivateTarget(driver);
                          }
                        : undefined
                    }
                    onDeactivate={
                      canUpdate && isActive
                        ? () => {
                            setStatusError(null);
                            setDeactivateTarget(driver);
                          }
                        : undefined
                    }
                  />
                );
              }}
            />
            <DashboardTablePagination
              page={driversPage}
              pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
              total={driversTotal}
              onPageChange={setPage}
            />
          </>
        )}
      </DashboardLayout>

      <ConfirmDialog
        open={!!activateTarget}
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
        open={!!deactivateTarget}
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
