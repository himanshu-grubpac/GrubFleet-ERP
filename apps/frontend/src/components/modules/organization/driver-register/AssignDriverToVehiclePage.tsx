"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { DashboardSubpageHeader } from "@/components/dashboard/DashboardSubpageHeader";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import {
  formatDriverLicenseDisplayDate,
  getLicenseExpiredTooltipMessage,
  isDrivingLicenseExpired,
} from "@/components/modules/organization/driver-register/driverLicenseUtils";
import { ApiClientError } from "@/lib/api/client";
import {
  assignOrganisationDriverVehicleApi,
  fetchAssignableVehiclesApi,
  fetchOrganisationDriverByIdApi,
  type AssignableVehicleListItem,
} from "@/lib/api/organisation/drivers";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import type { DashboardBreadcrumbItem } from "@/lib/navigation/dashboard-breadcrumbs";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

const PAGE_SIZE = 10;

function buildAssignBreadcrumbs(
  driverId: string,
  driverName: string,
): DashboardBreadcrumbItem[] {
  return [
    { label: "Organization", href: "/organization" },
    { label: "Driver Register", href: "/organization/driver-register" },
    {
      label: driverName,
      href: `/organization/driver-register/${driverId}`,
    },
    { label: "Assign to Vehicle" },
  ];
}

function AssignBlockedContent({
  driverId,
  driverName,
  licenseExpiry,
  canUpdate,
}: {
  driverId: string;
  driverName: string;
  licenseExpiry: string;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const expiryDisplay = formatDriverLicenseDisplayDate(licenseExpiry);

  return (
    <main className="px-6 py-3 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">
        Assign {driverName} to a vehicle
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Vehicle assignment requires a valid driving license on file.
      </p>

      <div className="mt-4 flex gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-orange-700"
          aria-hidden
        />
        <p className="text-xs leading-relaxed text-orange-900">
          {getLicenseExpiredTooltipMessage(licenseExpiry)} ({expiryDisplay}).
          Renew the license and update driver details before assigning a vehicle
          tied to an active lease contract.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-lg rounded-lg border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
        </div>
        <h2 className="mt-4 text-base font-semibold text-gray-900">
          Assignment blocked — license expired
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          This driver cannot be assigned until the driving license is renewed
          and the expiry date is updated in the register.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="neutral"
            className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
            onClick={() =>
              router.push(`/organization/driver-register/${driverId}`)
            }
          >
            Cancel
          </Button>
          {canUpdate ? (
            <Button
              type="button"
              className="h-9 px-5"
              onClick={() =>
                router.push(`/organization/driver-register/${driverId}/edit`)
              }
            >
              Update license info
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function AssignVehicleTableContent({
  driverId,
  driverName,
  organizationId,
  token,
  canUpdate,
}: {
  driverId: string;
  driverName: string;
  organizationId: string;
  token: string;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );

  const vehiclesQuery = useQuery({
    queryKey: [
      "organization",
      "drivers",
      "assignable-vehicles",
      organizationId,
      page,
    ],
    queryFn: () =>
      fetchAssignableVehiclesApi(token, organizationId, page, PAGE_SIZE),
    enabled: !!token && !!organizationId,
    ...dashboardListQueryOptions,
  });

  const assignMutation = useMutation({
    mutationFn: async (vehicle: AssignableVehicleListItem) =>
      assignOrganisationDriverVehicleApi(token, organizationId, driverId, {
        vehicleCode: vehicle.vehicleCode,
        assetClass: vehicle.assetClass,
        activeLeaseId: vehicle.activeLeaseId,
        vehicleTiedToContract: true,
      }),
    onSuccess: (updated, vehicle) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "drivers"],
      });
      showSuccessToast(
        `${driverName} was assigned to ${vehicle.vehicleCode}`,
      );
      router.replace(`/organization/driver-register/${driverId}`);
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not assign vehicle. Try again.";
      showErrorToast(message);
    },
  });

  const pageRows = vehiclesQuery.data?.items ?? [];
  const total = vehiclesQuery.data?.total ?? 0;

  const selectedRow = selectedVehicleId
    ? pageRows.find((row) => row.id === selectedVehicleId)
    : undefined;

  const canConfirm =
    canUpdate && Boolean(selectedRow) && !assignMutation.isPending;

  const handleConfirm = () => {
    if (!selectedRow) {
      return;
    }
    assignMutation.mutate(selectedRow);
  };

  return (
    <main className="px-6 py-3 pb-8">
      <h1 className="text-xl font-semibold text-gray-900">
        Assign {driverName} to a vehicle
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        These vehicles are on an active lease with no driver assigned.
      </p>

      {vehiclesQuery.isLoading ? (
        <div
          className="mt-4 min-h-[200px] animate-pulse rounded-lg bg-gray-100"
          aria-busy="true"
        />
      ) : vehiclesQuery.isError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load assignable vehicles.
          <button
            type="button"
            onClick={() => vehiclesQuery.refetch()}
            className="ml-2 font-medium underline"
          >
            Retry
          </button>
        </div>
      ) : total === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-gray-900">
            No assignable vehicles yet
          </p>
          <p className="mt-2 text-xs text-gray-500">
            No vehicles on an active lease are available without a driver
            assignment. Confirm lease allocations in Fleet &amp; Leasing first.
          </p>
          <Button
            type="button"
            variant="neutral"
            className="mt-6 h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
            onClick={() =>
              router.push(`/organization/driver-register/${driverId}`)
            }
          >
            Back to driver
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="w-12 px-4 py-3" scope="col">
                      <span className="sr-only">Select</span>
                    </th>
                    <th
                      className="px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-gray-500"
                      scope="col"
                    >
                      Vehicle
                    </th>
                    <th
                      className="px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-gray-500"
                      scope="col"
                    >
                      Asset class
                    </th>
                    <th
                      className="px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-gray-500"
                      scope="col"
                    >
                      Active lease
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.map((row) => {
                    const checked = selectedVehicleId === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={
                          checked ? "bg-orange-50/40" : "hover:bg-gray-50/80"
                        }
                      >
                        <td className="px-4 py-3">
                          <input
                            type="radio"
                            name="assign-vehicle"
                            checked={checked}
                            onChange={() => setSelectedVehicleId(row.id)}
                            disabled={!canUpdate}
                            aria-label={`Select ${row.vehicleCode}`}
                            className="h-4 w-4 border-gray-300 text-[#FE5720] focus:ring-[#FE5720]"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {row.vehicleCode}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.assetClass}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/fleet-leasing/lease-contracts/?leaseId=${encodeURIComponent(row.activeLeaseId)}`}
                            className="text-sm font-medium text-[#FE5720] hover:underline"
                          >
                            {row.activeLeaseId}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-4 pb-4">
              <DashboardTablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
                disabled={assignMutation.isPending}
              />
            </div>
          </div>

          <div
            className="mt-4 flex gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
            role="status"
          >
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-gray-600">
              Confirming assignment will mark this driver as{" "}
              <span className="font-medium text-gray-800">Active</span> and tie
              them to the selected vehicle under the active lease contract.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="neutral"
              disabled={assignMutation.isPending}
              className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
              onClick={() =>
                router.push(`/organization/driver-register/${driverId}`)
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 px-5"
              disabled={!canConfirm}
              loading={assignMutation.isPending}
              onClick={handleConfirm}
            >
              Confirm assignment
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

export default function AssignDriverToVehiclePage() {
  const params = useParams();
  const driverId = params.id as string;

  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();
  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const driverQuery = useQuery({
    queryKey: ["organization", "drivers", organizationId, driverId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationDriverByIdApi(token, organizationId, driverId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading && !!driverId,
    ...dashboardListQueryOptions,
  });

  const driver = driverQuery.data;

  if (driverQuery.isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <DashboardSubpageHeader
          backHref="/organization/driver-register"
          backLabel="Back to driver register"
        />
        <main className="px-6 py-8">
          <p className="text-sm text-gray-600" aria-busy="true">
            Loading…
          </p>
        </main>
      </div>
    );
  }

  if (driverQuery.isError || !driver || !token || !organizationId) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <DashboardSubpageHeader
          backHref="/organization/driver-register"
          backLabel="Back to driver register"
        />
        <main className="px-6 py-8">
          <p className="text-sm text-red-600" role="alert">
            Driver not found.
          </p>
        </main>
      </div>
    );
  }

  const licenseExpired = isDrivingLicenseExpired(driver.licenseExpiry);
  const breadcrumbs = buildAssignBreadcrumbs(driver.id, driver.name);
  const viewHref = `/organization/driver-register/${driver.id}`;

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <DashboardSubpageHeader
        backHref={viewHref}
        backLabel="Back to driver"
        breadcrumbItems={breadcrumbs}
      />
      {licenseExpired && driver.licenseExpiry ? (
        <AssignBlockedContent
          driverId={driver.id}
          driverName={driver.name}
          licenseExpiry={driver.licenseExpiry}
          canUpdate={canUpdate}
        />
      ) : (
        <AssignVehicleTableContent
          driverId={driver.id}
          driverName={driver.name}
          organizationId={organizationId}
          token={token}
          canUpdate={canUpdate}
        />
      )}
    </div>
  );
}
