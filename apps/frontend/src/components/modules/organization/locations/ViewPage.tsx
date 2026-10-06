"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
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

const EMPTY = "—";

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

  const handleToggleStatus = () => {
    const location = locationQuery.data;
    if (!location || !canUpdate) return;
    setStatusError(null);
    if (location.status === "active") {
      setDeactivateOpen(true);
      return;
    }
    setActivateOpen(true);
  };

  if (isAuthLoading || locationQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading location...
      </div>
    );
  }

  if (locationQuery.isError || !locationQuery.data) {
    return (
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
    );
  }

  const location = locationQuery.data;
  const isActive = location.status === "active";
  const addressDisplay = formatStructuredAddressMultiline(location);
  const sitePhoneCountry = getCountryDefinition(
    location.addressCountry,
  ).phoneDefaultCountry;

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
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
            >
              {isActive ? "Active" : "Deactivated"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && isActive ? (
              <Button type="button" variant="secondary" onClick={handleEdit}>
                Edit
              </Button>
            ) : null}
            {canUpdate ? (
              <Button
                type="button"
                onClick={handleToggleStatus}
                disabled={statusMutation.isPending}
              >
                {isActive ? "Deactivate" : "Activate"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Address
              </dt>
              <dd className="mt-1.5 whitespace-pre-line text-sm font-medium text-gray-900">
                {addressDisplay || EMPTY}
              </dd>
            </div>
            <DetailField
              label="Site contact phone"
              value={
                formatPhoneDisplay(
                  location.siteContactPhone,
                  sitePhoneCountry,
                ) || EMPTY
              }
            />
            <DetailField
              label="Site contact email"
              value={location.siteContactEmail || EMPTY}
            />
            <DetailField
              label="Responsible person"
              value={location.responsiblePerson || EMPTY}
            />
            <DetailField
              label="Responsible phone"
              value={
                formatPhoneDisplay(location.responsiblePersonPhone) || EMPTY
              }
            />
            <DetailField
              label="Responsible email"
              value={location.responsiblePersonEmail || EMPTY}
            />
            <DetailField
              label="Deputy"
              value={location.deputyName || EMPTY}
            />
            <DetailField
              label="Deputy phone"
              value={formatPhoneDisplay(location.deputyPhone) || EMPTY}
            />
            <DetailField
              label="Deputy email"
              value={location.deputyEmail || EMPTY}
            />
          </dl>
        </div>
      </main>

      <ConfirmDialog
        open={activateOpen}
        title="Activate location?"
        message={`${location.name} will be marked active and available for use across the organisation.`}
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateOpen(false);
            setStatusError(null);
          }
        }}
        onConfirm={() => {
          void statusMutation.mutateAsync({ action: "activate" });
        }}
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
        reasonPlaceholder="Enter reason for deactivation..."
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
    </div>
  );
}
