"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ChevronRight,
  Info,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationLocationByIdApi,
  updateOrganisationLocationStatusApi,
} from "@/lib/api/organisation/locations";
import { ApiClientError } from "@/lib/api/client";

export default function LocationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const locationId = params.id as string;

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
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
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "location"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["organization", "locations"],
      });
      setDeactivateOpen(false);
      setDeactivateReason("");
      setStatusError(null);
    },
    onError: (error: Error) => {
      setStatusError(error.message || "Failed to update status.");
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
    await statusMutation.mutateAsync({ action: "activate" });
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

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-2.5">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Link href="/organization" className="hover:text-gray-700">
              Organization
            </Link>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <Link
              href="/organization/locations"
              className="hover:text-gray-700"
            >
              Locations
            </Link>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span className="font-medium text-gray-800">{location.name}</span>
          </div>
        </div>
      </div>

      <main className="px-6 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-gray-900">
              {location.name}
            </h1>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
              {location.type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleEdit}
              disabled={!isActive}
            >
              Edit
            </Button>
            <Button type="button" onClick={() => void handleToggleStatus()}>
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-700">
          <p>
            <span className="font-medium text-gray-900">Status:</span>{" "}
            {isActive ? "Active" : "Deactivated"}
          </p>
          <p className="mt-2">
            <span className="font-medium text-gray-900">Address:</span>{" "}
            {location.address}
          </p>
          {(location.siteContactPhone || location.siteContactEmail) && (
            <p className="mt-2">
              <span className="font-medium text-gray-900">Site contact:</span>{" "}
              {[location.siteContactPhone, location.siteContactEmail]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {location.responsiblePerson && (
            <p className="mt-2">
              <span className="font-medium text-gray-900">
                Responsible person:
              </span>{" "}
              {location.responsiblePerson}
            </p>
          )}
        </div>

        <div className="mt-4 flex gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <p>
            Employee dropdowns for responsible person and deputy will populate
            when the Organisation Employees API is available.
          </p>
        </div>
      </main>

      {deactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            className="w-full max-w-[460px] rounded-lg bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-location-title"
          >
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle
                  className="h-4 w-4 text-red-500"
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h2
                  id="deactivate-location-title"
                  className="text-sm font-semibold text-gray-900"
                >
                  Deactivate this location?
                </h2>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  This will deactivate{" "}
                  <span className="font-medium text-gray-700">
                    &quot;
                    {location.name}
                    &quot;
                  </span>{" "}
                  from the location register.
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="mt-4">
              <label
                htmlFor="deactivate-reason"
                className="mb-1.5 block text-xs font-medium text-gray-700"
              >
                Reason
                <span className="ml-1 text-red-500">*</span>
              </label>

              <textarea
                id="deactivate-reason"
                value={deactivateReason}
                onChange={(event) => {
                  const value = event.target.value;

                  setDeactivateReason(value);

                  if (value.trim()) {
                    setStatusError(null);
                  }
                }}
                placeholder="Enter reason for deactivation..."
                rows={3}
                className={[
                  "w-full resize-none rounded-md bg-white px-3 py-2 text-xs text-gray-900 outline-none placeholder:text-gray-400",
                  statusError
                    ? "border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    : "border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-200",
                ].join(" ")}
              />

              {statusError && (
                <p className="mt-1 text-xs text-red-500">
                  {statusError}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="neutral"
                onClick={() => {
                  setDeactivateOpen(false);
                  setDeactivateReason("");
                  setStatusError(null);
                }}
                disabled={statusMutation.isPending}
                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="neutral"
                disabled={statusMutation.isPending}
                onClick={() => {
                  const reason = deactivateReason.trim();

                  if (!reason) {
                    setStatusError(
                      "Please enter a deactivation reason."
                    );
                    return;
                  }

                  void statusMutation.mutateAsync({
                    action: "deactivate",
                    reason,
                  });
                }}
                className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
              >
                {statusMutation.isPending
                  ? "Deactivating..."
                  : "Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
