"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { DashboardSubpageHeader } from "@/components/dashboard/DashboardSubpageHeader";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationLocationByIdApi,
  updateOrganisationLocationStatusApi,
} from "@/lib/api/organisation/locations";
import { ApiClientError } from "@/lib/api/client";
import {
  LOCATION_STATUS_UPDATE_ERROR,
  showErrorToast,
  showLocationActivatedToast,
  showLocationDeactivatedToast,
} from "@/lib/toast/show-toast";
import { formatStructuredAddressMultiline } from "@/lib/format/address-format";
import { formatPhoneDisplay } from "@/lib/format/phone-format";
import { getCountryDefinition } from "@/lib/geo/countries";

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function LocationDetailChrome({
  breadcrumbName,
  children,
}: {
  breadcrumbName?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <DashboardSubpageHeader
        backHref="/organization/locations"
        backLabel="Back to locations"
        currentLabel={breadcrumbName}
      />
      {children}
    </div>
  );
}

export default function LocationDetailsPage() {
  const params = useParams();
  const router = useRouter();
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

  const locationId = params.id as string;

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const locationQuery = useQuery({
    queryKey: ["organization", "location", organizationId, locationId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationLocationByIdApi(
        token,
        organizationId,
        locationId,
      );
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateOrganisationLocationStatusApi(
        token,
        organizationId,
        locationId,
        input,
      );
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "location"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["organization", "locations"],
      });
      setDeactivateOpen(false);
      setActivateOpen(false);
      setStatusError(null);
      if (data.status === "active") {
        showLocationActivatedToast(data.name);
      } else {
        showLocationDeactivatedToast(data.name);
      }
    },
    onError: (error: Error) => {
      const message = error.message || LOCATION_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  const handleEdit = () => {
    router.push(`/organization/locations/${locationId}/edit`);
  };

  const handleToggleStatus = async () => {
    const location = locationQuery.data;
    if (!location) return;
    setStatusError(null);
    if (location.status === "active") {
      setDeactivateOpen(true);
      return;
    }
    setActivateOpen(true);
  };

  const handleConfirmActivate = () => {
    void statusMutation.mutateAsync({ action: "activate" });
  };

  if (isAuthLoading || locationQuery.isLoading) {
    return (
      <LocationDetailChrome>
        <main className="px-6 py-3">
          <div
            className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500"
            aria-busy="true"
          >
            Loading location...
          </div>
        </main>
      </LocationDetailChrome>
    );
  }

  if (locationQuery.isError || !locationQuery.data) {
    return (
      <LocationDetailChrome>
        <main className="px-6 py-3">
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-red-600">
              {locationQuery.error instanceof ApiClientError
                ? locationQuery.error.message
                : "Failed to load location."}
            </p>
            <button
              type="button"
              onClick={() => void locationQuery.refetch()}
              className="text-sm text-gray-600 underline"
            >
              Try again
            </button>
          </div>
        </main>
      </LocationDetailChrome>
    );
  }

  const location = locationQuery.data;
  const isActive = location.status === "active";
  const addressDisplay = formatStructuredAddressMultiline(location);
  const sitePhoneCountry = getCountryDefinition(
    location.addressCountry,
  ).phoneDefaultCountry;

  return (
    <LocationDetailChrome breadcrumbName={location.name}>
      <main className="px-6 py-3 pb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-[15px] font-semibold text-gray-900">
              {location.name}
            </h1>
            <span className="inline-flex shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-[#FE5720]">
              {location.type}
            </span>
            <span
              className={[
                "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500",
              ].join(" ")}
              aria-label={`Status: ${isActive ? "Active" : "Inactive"}`}
            >
              {isActive ? "Active" : "Deactivated"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isActive ? (
              <>
                {canUpdate ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => void handleToggleStatus()}
                  disabled={statusMutation.isPending}
                >
                  Deactivate
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => void handleToggleStatus()}
                disabled={statusMutation.isPending}
              >
                Activate
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Address
              </dt>
              <dd className="mt-1.5 whitespace-pre-line text-sm font-medium text-gray-900">
                {addressDisplay}
              </dd>
            </div>
            <DetailField
              label="Office contact phone"
              value={
                formatPhoneDisplay(
                  location.siteContactPhone,
                  sitePhoneCountry,
                ) || "—"
              }
            />
            <DetailField
              label="Office contact email"
              value={location.siteContactEmail || "—"}
            />
            <DetailField
              label="Responsible person"
              value={location.responsiblePerson || "—"}
            />
            <DetailField
              label="Responsible phone"
              value={
                formatPhoneDisplay(location.responsiblePersonPhone) || "—"
              }
            />
            <DetailField
              label="Responsible email"
              value={location.responsiblePersonEmail || "—"}
            />
            <DetailField label="Deputy" value={location.deputyName || "—"} />
            <DetailField
              label="Deputy phone"
              value={
                formatPhoneDisplay(location.deputyPhone) || "—"
              }
            />
            <DetailField
              label="Deputy email"
              value={location.deputyEmail || "—"}
            />
          </dl>

          <div className="mt-6 flex gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
              aria-hidden
            />
            <p>
              Locations aren&apos;t just for warehousing — offices, workshops,
              retail outlets and more all live in this register. Asset Management
              and Inventory use these entries when marking where a vehicle or
              part is kept.
            </p>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={activateOpen}
        title={`Activate ${location.name}?`}
        message="This location will be marked active and available for use across the organisation."
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateOpen(false);
            setStatusError(null);
          }
        }}
        onConfirm={handleConfirmActivate}
      />

      <ReasonRequiredDialog
        open={deactivateOpen}
        title="Deactivate location?"
        description={
          <>
            <span className="font-medium text-gray-900">{location.name}</span>{" "}
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
          setDeactivateOpen(false);
          setStatusError(null);
        }}
        onConfirm={(reason) => {
          void statusMutation.mutateAsync({
            action: "deactivate",
            reason,
          });
        }}
      />
    </LocationDetailChrome>
  );
}
