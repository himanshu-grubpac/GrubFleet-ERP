"use client";

import { useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { DashboardSubpageHeader } from "@/components/dashboard/DashboardSubpageHeader";
import {
  formatDriverLicenseDisplayDate,
  getLicenseExpiredTooltipMessage,
  isDrivingLicenseExpired,
} from "@/components/modules/organization/driver-register/driverLicenseUtils";
import { formatPhoneDisplay } from "@/lib/format/phone-format";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchOrganisationDriverByIdApi,
  unassignOrganisationDriverVehicleApi,
  updateOrganisationDriverStatusApi,
  type OrganisationDriverDetail,
} from "@/lib/api/organisation/drivers";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  DRIVER_STATUS_UPDATE_ERROR,
  showDriverActivatedToast,
  showDriverDeactivatedToast,
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

const SYSTEM_STATUS_INFO_COPY =
  "Active/Inactive reflects compliance checks (such as license validity), contract linkage, and vehicle assignment rules. Update driver details with Edit while active, or use Deactivate and Activate to change register status.";

function DriverDetailChrome({
  breadcrumbName,
  children,
}: {
  breadcrumbName?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <DashboardSubpageHeader
        backHref="/organization/driver-register"
        backLabel="Back to driver register"
        currentLabel={breadcrumbName}
      />
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase text-gray-400">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-800">{value}</p>
    </div>
  );
}

function DriverInfoCard({
  driver,
  licenseExpired,
  licenseLine,
  phoneDisplay,
}: {
  driver: OrganisationDriverDetail;
  licenseExpired: boolean;
  licenseLine: string;
  phoneDisplay: string;
}) {
  const emailDisplay = driver.email?.trim() || "—";
  const addressDisplay = driver.addressLocality?.trim() || "—";
  const contactLine = [emailDisplay, addressDisplay]
    .filter((part) => part !== "—")
    .join(" · ");
  const contactFallback = contactLine.length > 0 ? contactLine : "—";

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label="CPR NO." value={driver.cprNo || "—"} />
        <div>
          <p className="text-[10px] font-medium uppercase text-gray-400">
            LICENSE NO. / EXPIRY
          </p>
          <p
            className={[
              "mt-0.5 text-xs font-medium",
              licenseExpired ? "text-red-600" : "text-gray-800",
            ].join(" ")}
            title={
              licenseExpired && driver.licenseExpiry
                ? getLicenseExpiredTooltipMessage(driver.licenseExpiry)
                : undefined
            }
          >
            {licenseLine}
          </p>
        </div>
        <InfoItem label="MOBILE" value={phoneDisplay} />
        <InfoItem label="SUPPLIER" value={driver.supplier || "—"} />
      </div>
      <div className="mt-3 border-t border-gray-100 pt-3">
        <p className="text-[10px] font-medium uppercase text-gray-400">
          EMAIL · ADDRESS
        </p>
        <p className="mt-0.5 text-xs text-gray-600">{contactFallback}</p>
      </div>
    </div>
  );
}

function VehicleAssignmentSection({
  driver,
  licenseExpired,
  canUpdate,
  onAssignClick,
  onUnassignClick,
  unassignPending,
}: {
  driver: OrganisationDriverDetail;
  licenseExpired: boolean;
  canUpdate: boolean;
  onAssignClick: () => void;
  onUnassignClick: () => void;
  unassignPending: boolean;
}) {
  const isActive = driver.status === "active";
  const hasVehicle = Boolean(driver.assignedVehicle?.trim());

  if (licenseExpired && driver.licenseExpiry) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
            aria-hidden
          />
          <p className="text-xs text-amber-900">
            {getLicenseExpiredTooltipMessage(driver.licenseExpiry)}. Vehicle
            assignment is blocked until the license is renewed.
          </p>
        </div>
        {canUpdate ? (
          <Button
            type="button"
            variant="neutral"
            className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
            onClick={onAssignClick}
          >
            Assign to Vehicle
          </Button>
        ) : null}
      </div>
    );
  }

  if (hasVehicle) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <p className="text-[10px] font-medium uppercase text-gray-400">
          Assigned vehicle
        </p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900">
          {driver.assignedVehicle}
        </p>
        <p className="mt-2 text-xs font-medium text-green-700">
          {driver.vehicleTiedToContract
            ? "Active — tied to the current contract"
            : "Active"}
        </p>
        {canUpdate ? (
          <Button
            type="button"
            variant="neutral"
            disabled={unassignPending}
            className="mt-3 h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
            onClick={onUnassignClick}
          >
            {unassignPending ? "Removing…" : "Remove assignment"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-4">
      <p className="text-xs text-gray-500">
        {isActive
          ? "No vehicle assigned to this driver."
          : "No vehicle assigned. Assignment is available when the driver is active."}
      </p>
      {canUpdate && isActive ? (
        <Button
          type="button"
          variant="neutral"
          className="mt-3 h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
          onClick={onAssignClick}
        >
          Assign to Vehicle
        </Button>
      ) : null}
    </div>
  );
}

export default function DriverViewPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;

  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

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

  const unassignMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId || !driverId) {
        throw new Error("Missing auth context");
      }
      return unassignOrganisationDriverVehicleApi(
        token,
        organizationId,
        driverId,
      );
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "drivers"],
      });
      setUnassignOpen(false);
      showSuccessToast(
        updated.assignedVehicle
          ? `Vehicle assignment updated for ${updated.name}`
          : `${updated.name} is no longer assigned to a vehicle`,
      );
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not remove vehicle assignment. Try again.";
      showErrorToast(message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId || !driver) {
        throw new Error("Missing auth context");
      }
      return updateOrganisationDriverStatusApi(
        token,
        organizationId,
        driver.id,
        input,
      );
    },
    onSuccess: (updated, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "drivers"],
      });
      setDeactivateOpen(false);
      setActivateOpen(false);
      setStatusError(null);
      if (variables.action === "activate") {
        showDriverActivatedToast(updated.name);
      } else {
        showDriverDeactivatedToast(updated.name);
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

  if (driverQuery.isLoading || isAuthLoading) {
    return (
      <DriverDetailChrome>
        <main className="px-6 py-8">
          <p className="text-sm text-gray-600" aria-busy="true">
            Loading driver…
          </p>
        </main>
      </DriverDetailChrome>
    );
  }

  if (driverQuery.isError || !driver) {
    return (
      <DriverDetailChrome>
        <main className="px-6 py-8">
          <p className="text-sm text-red-600" role="alert">
            Driver not found.
          </p>
        </main>
      </DriverDetailChrome>
    );
  }

  const licenseExpired = isDrivingLicenseExpired(driver.licenseExpiry);
  const phoneDisplay =
    formatPhoneDisplay(driver.phone) || driver.phone || "—";
  const licenseExpiryDisplay = driver.licenseExpiry
    ? formatDriverLicenseDisplayDate(driver.licenseExpiry)
    : "—";
  const licenseLine = `${driver.licenseNumber} · ${licenseExpiryDisplay}`;
  const isActive = driver.status === "active";

  return (
    <>
      <DriverDetailChrome breadcrumbName={driver.name}>
        <main className="px-6 py-3 pb-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {driver.name}
              </h1>
              {isActive ? (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                  Inactive
                </span>
              )}
              {licenseExpired ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                  License expired
                </span>
              ) : null}
            </div>

            {canUpdate ? (
              <div className="flex shrink-0 items-center gap-2">
                {isActive ? (
                  <>
                    <Button
                      type="button"
                      variant="neutral"
                      onClick={() =>
                        router.push(
                          `/organization/driver-register/${driver.id}/edit`,
                        )
                      }
                      className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="neutral"
                      onClick={() => {
                        setStatusError(null);
                        setDeactivateOpen(true);
                      }}
                      className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                    >
                      Deactivate
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={() => {
                      setStatusError(null);
                      setActivateOpen(true);
                    }}
                    className="h-9 border-[#FE5720] bg-white px-5 text-[#FE5720] hover:bg-orange-50"
                  >
                    Activate
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          <DriverInfoCard
            driver={driver}
            licenseExpired={licenseExpired}
            licenseLine={licenseLine}
            phoneDisplay={phoneDisplay}
          />

          <section className="mt-4" aria-labelledby="vehicle-assignment-heading">
            <h2
              id="vehicle-assignment-heading"
              className="mb-3 text-sm font-semibold text-gray-900"
            >
              Vehicle assignment
            </h2>
            <VehicleAssignmentSection
              driver={driver}
              licenseExpired={licenseExpired}
              canUpdate={canUpdate}
              unassignPending={unassignMutation.isPending}
              onAssignClick={() =>
                router.push(
                  `/organization/driver-register/${driver.id}/assign`,
                )
              }
              onUnassignClick={() => setUnassignOpen(true)}
            />
          </section>

          <div
            className="mt-4 flex gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
            role="status"
          >
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-gray-600">
              {SYSTEM_STATUS_INFO_COPY}
            </p>
          </div>
        </main>
      </DriverDetailChrome>

      <ConfirmDialog
        open={unassignOpen}
        title="Remove vehicle assignment?"
        message={
          driver.assignedVehicle
            ? `${driver.name} will be unlinked from ${driver.assignedVehicle}${
                driver.vehicleTiedToContract
                  ? " and marked inactive until reassigned."
                  : "."
              }`
            : `${driver.name} will be unlinked from their vehicle.`
        }
        confirmLabel="Remove assignment"
        isConfirmPending={unassignMutation.isPending}
        onClose={() => {
          if (!unassignMutation.isPending) {
            setUnassignOpen(false);
          }
        }}
        onConfirm={() => {
          unassignMutation.mutate();
        }}
      />

      <ConfirmDialog
        open={activateOpen}
        title="Activate driver?"
        message={`${driver.name} will be marked active in the driver register.`}
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

      <ReasonRequiredDialog
        open={deactivateOpen}
        title="Deactivate driver?"
        description={
          <>
            <span className="font-medium text-gray-900">{driver.name}</span>{" "}
            will be marked inactive. Provide a reason — it is recorded in the
            audit log.
          </>
        }
        reasonLabel="Reason for deactivation"
        reasonPlaceholder="Reason for deactivation"
        confirmLabel="Deactivate"
        pendingLabel="Deactivating..."
        isPending={statusMutation.isPending}
        error={statusError}
        onClose={() => {
          if (!statusMutation.isPending) {
            setDeactivateOpen(false);
            setStatusError(null);
          }
        }}
        onConfirm={(reason) => {
          statusMutation.mutate({ action: "deactivate", reason });
        }}
      />
    </>
  );
}
