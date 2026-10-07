"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Phone,
  Mail,
  MapPin,
  UserRound,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchOrganisationDriverByIdApi,
  updateOrganisationDriverStatusApi,
} from "@/lib/api/organisation/drivers";
import {
  DRIVER_STATUS_UPDATE_ERROR,
  showDriverActivatedToast,
  showDriverDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

export default function ViewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const driverId = String(params.id);

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const driverQuery = useQuery({
    queryKey: ["organization", "drivers", organizationId, driverId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationDriverByIdApi(
        token,
        organizationId,
        driverId,
      );
    },
    enabled: !!token && !!organizationId && !!driverId && !isAuthLoading,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateOrganisationDriverStatusApi(
        token,
        organizationId,
        driverId,
        input,
      );
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "drivers", organizationId, driverId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["organization", "drivers"],
      });
      setActivateOpen(false);
      setDeactivateOpen(false);
      setStatusError(null);
      if (variables.action === "activate") {
        showDriverActivatedToast(data.name);
      } else {
        showDriverDeactivatedToast(data.name);
      }
    },
    onError: (error) => {
      const message =
        error instanceof ApiClientError
          ? error.message || DRIVER_STATUS_UPDATE_ERROR
          : DRIVER_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  if (isAuthLoading || driverQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <main className="px-6 py-3">
          <p className="text-sm text-gray-500">Loading driver...</p>
        </main>
      </div>
    );
  }

  if (driverQuery.isError || !driverQuery.data) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <main className="px-6 py-3">
          <p className="text-sm text-red-600">
            {driverQuery.error instanceof ApiClientError
              ? driverQuery.error.message
              : "Driver not found."}
          </p>
          <button
            type="button"
            onClick={() => void driverQuery.refetch()}
            className="mt-2 text-sm text-gray-600 underline"
          >
            Try again
          </button>
        </main>
      </div>
    );
  }

  const detail = driverQuery.data;
  const isActive = detail.status === "active";

  const driver = {
    id: detail.id,
    name: detail.name,
    employeeId: detail.cprNo || "—",
    driverType: detail.supplier || "—",
    phone: detail.phone || "—",
    email: detail.email || "—",
    licenseNumber: detail.licenseNumber || "—",
    licenseType: detail.assignedVehicleAssetClass || "—",
    licenseExpiry: detail.licenseExpiry || "—",
    address: detail.addressLocality || detail.address || "—",
    status: detail.status,
  };

  const handleEdit = () => {
    if (!isActive || !canUpdate) return;
    router.push(`/organization/driver-register/${driverId}/edit`);
  };

  const handleToggleStatus = () => {
    if (!canUpdate) return;
    setStatusError(null);
    if (driver.status === "active") {
      setDeactivateOpen(true);
      return;
    }
    setActivateOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <main className="px-6 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-gray-900">
              {driver.name}
            </h1>

            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
              {driver.driverType}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canUpdate && isActive ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleEdit}
              >
                Edit
              </Button>
            ) : null}

            {canUpdate ? (
              <Button type="button" onClick={handleToggleStatus}>
                {isActive ? "Deactivate" : "Activate"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Employee ID
              </p>
              <p className="mt-1 text-xs font-semibold text-gray-900">
                {driver.employeeId}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Driver type
              </p>
              <p className="mt-1 text-xs font-semibold text-gray-900">
                {driver.driverType}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Status
              </p>
              <div className="mt-1">
                <span
                  className={
                    isActive
                      ? "rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700"
                      : "rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600"
                  }
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-3">
          <h2 className="text-[13px] font-semibold text-gray-900">
            Contact information
          </h2>

          <div className="mt-3 rounded-lg border border-gray-200 bg-white">
            <div className="grid grid-cols-2 gap-6 px-4 py-4">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Contact number
                  </p>
                  <p className="mt-1 text-xs text-gray-700">{driver.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Email
                  </p>
                  <p className="mt-1 text-xs text-gray-700">{driver.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Address
                  </p>
                  <p className="mt-1 text-xs text-gray-700">{driver.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Driver
                  </p>
                  <p className="mt-1 text-xs text-gray-700">{driver.name}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-3">
          <h2 className="text-[13px] font-semibold text-gray-900">
            Driving licence
          </h2>

          <div className="mt-3 rounded-lg border border-gray-200 bg-white">
            <div className="grid grid-cols-3 gap-6 px-4 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Licence number
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-900">
                  {driver.licenseNumber}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Licence type
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-900">
                  {driver.licenseType}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Expiry date
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-900">
                  {driver.licenseExpiry}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

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
    </div>
  );
}
