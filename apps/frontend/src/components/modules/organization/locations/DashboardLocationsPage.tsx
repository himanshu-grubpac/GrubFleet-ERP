"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationLocationsApi,
  updateOrganisationLocationStatusApi,
  type OrganisationLocationListItem,
} from "@/lib/api/organisation/locations";
import { fetchOrganisationLocationTypesApi } from "@/lib/api/organisation/location-types";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardContact from "@/components/dashboard/DashboardContact";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Location = OrganisationLocationListItem;

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function LocationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const [deactivateTarget, setDeactivateTarget] =
    useState<Location | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<
    Record<string, string>
  >({
    type: "",
    status: "",
  });

  /* ------------------------------------------------------------------------ */
  /* Locations                                                                */
  /* ------------------------------------------------------------------------ */
  const locationTypesQuery = useQuery({
    queryKey: ["organization", "location-types", organizationId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationLocationTypesApi(token, organizationId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  const selectedTypeId = useMemo(() => {
    if (!filters.type) return undefined;
    return locationTypesQuery.data?.items.find(
      (type) =>
        type.presetKey === filters.type ||
        type.id === filters.type ||
        type.name.toLowerCase() === filters.type.toLowerCase(),
    )?.id;
  }, [filters.type, locationTypesQuery.data?.items]);

  const locationsQuery = useQuery({
    queryKey: [
      "organization",
      "locations",
      organizationId,
      search,
      filters.status,
      selectedTypeId,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationLocationsApi(token, {
        organizationId,
        page: 1,
        pageSize: 20,
        search: search.trim() || undefined,
        locationTypeId: selectedTypeId,
        status:
          filters.status === "active" || filters.status === "inactive"
            ? filters.status
            : undefined,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  const locations = locationsQuery.data?.items ?? [];
  const filteredLocations = locations;

  const statusMutation = useMutation({
    mutationFn: async (input: {
      location: Location;
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateOrganisationLocationStatusApi(
        token,
        organizationId,
        input.location.id,
        { action: input.action, reason: input.reason },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "locations"],
      });
      setDeactivateTarget(null);
      setDeactivateReason("");
      setStatusError(null);
    },
    onError: (error: Error) => {
      setStatusError(error.message || "Failed to update location status.");
    },
  });

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                               */
  /* ------------------------------------------------------------------------ */

  const handleAddLocation = () => {
    router.push(
      "/organization/locations/create"
    );
  };

  const handleEdit = (location: Location) => {
    router.push(
      `/organization/locations/${location.id}/edit`
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Copy                                                                     */
  /* ------------------------------------------------------------------------ */

  const handleCopy = async (location: Location) => {
    try {
      await navigator.clipboard.writeText(
        location.id
      );

      console.log(
        "Location ID copied:",
        location.id
      );
    } catch (error) {
      console.error(
        "Failed to copy location:",
        error
      );
    }
  };

  const handleToggleStatus = async (location: Location) => {
    setStatusError(null);
    if (location.status === "active") {
      setDeactivateTarget(location);
      setDeactivateReason("");
      return;
    }
    await statusMutation.mutateAsync({
      location,
      action: "activate",
    });
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const reason = deactivateReason.trim();
    if (!reason) {
      setStatusError("Please enter a reason to deactivate this location.");
      return;
    }
    await statusMutation.mutateAsync({
      location: deactivateTarget,
      action: "deactivate",
      reason,
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Clear Filters                                                            */
  /* ------------------------------------------------------------------------ */

  const handleClearFilters = () => {
    setSearch("");

    setFilters({
      type: "",
      status: "",
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Table Columns                                                            */
  /* ------------------------------------------------------------------------ */

  const locationColumns = [
    {
      key: "name",
      label: "Location",
    },

    {
      key: "type",
      label: "Type",
    },

    {
      key: "address",
      label: "Address",
    },

    {
      key: "responsiblePerson",
      label: "Responsible Person",
    },

    {
      key: "contact",
      label: "Contact",
      render: (location: Location) => (
        <DashboardContact
          phone={location.phone}
          email={location.email}
        />
      ),
    },



    {
      key: "status",
      label: "Status",

      render: (location: Location) => (
        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
            location.status === "active"
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-500",
          ].join(" ")}
        >
          {location.status === "active"
            ? "Active"
            : "Deactivated"}
        </span>
      ),
    },
  ];

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                  */
  /* ------------------------------------------------------------------------ */

  if (isAuthLoading || locationsQuery.isLoading) {
    return (
      <DashboardLayout
        title="Locations"
        description="The organisation's physical footprint — offices, workshops, warehouses, retail outlets, and more."
        action={
          <Button
            type="button"
            onClick={handleAddLocation}
          >
            + Add Location
          </Button>
        }
      >
        <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white">
          <p className="text-sm text-gray-500">
            Loading locations...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Error                                                                    */
  /* ------------------------------------------------------------------------ */

  if (locationsQuery.isError) {
    return (
      <DashboardLayout
        title="Locations"
        description="The organisation's physical footprint — offices, workshops, warehouses, retail outlets, and more."
        action={
          <Button
            type="button"
            onClick={handleAddLocation}
          >
            + Add Location
          </Button>
        }
      >
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white">
          <p className="text-sm font-medium text-red-600">
            Failed to load locations.
          </p>

          <button
            type="button"
            onClick={() =>
              locationsQuery.refetch()
            }
            className="mt-2 text-sm text-gray-600 underline"
          >
            Try again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <DashboardLayout
      title="Locations"
      description="The organisation's physical footprint — offices, workshops, warehouses, retail outlets, and more."
      tabs={[
        {
          label: "Locations",
          href: "/organization/locations",
        },
      ]}
      activeTab="/organization/locations"
      action={
        <Button
          type="button"
          onClick={handleAddLocation}
        >
          + Add Location
        </Button>
      }
    >
      {/* ------------------------------------------------------------------ */}
      {/* Filters                                                            */}
      {/* ------------------------------------------------------------------ */}

      {locations.length > 0 && (
        <DashboardFilters
          searchValue={search}
          searchPlaceholder="Search locations..."
          onSearchChange={setSearch}
          selectFilters={[
            {
              key: "type",
              label: "All types",
              options: (locationTypesQuery.data?.items ?? []).map(
                (type) => ({
                  label: type.name,
                  value: type.presetKey ?? type.id,
                }),
              ),
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
                  label: "Deactivated",
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
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Empty State                                                        */}
      {/* ------------------------------------------------------------------ */}

      {locations.length === 0 ? (
        <DashboardEmptyState
          icon={
            <MapPin
              className="h-7 w-7"
              strokeWidth={1.4}
            />
          }
          title="No locations added yet"
          description="Add your first office, workshop, warehouse, or outlet."
          buttonLabel="Add Location"
          onButtonClick={handleAddLocation}
        />
      ) : filteredLocations.length === 0 ? (
        /* --------------------------------------------------------------- */
        /* No search/filter results                                       */
        /* --------------------------------------------------------------- */

        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
          <MapPin
            className="mb-3 h-7 w-7 text-gray-400"
            strokeWidth={1.4}
          />

          <h3 className="text-sm font-semibold text-gray-900">
            No locations found
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
        /* --------------------------------------------------------------- */
        /* Locations Table                                                 */
        /* --------------------------------------------------------------- */

        <DashboardTable
          columns={locationColumns}
          data={filteredLocations}
          getRowKey={(location) => location.id}
          renderActions={(location) => (
            <DashboardTableActions
              status={location.status}
              locationId={location.id}

              onEdit={() => handleEdit(location)}
              onToggleStatus={() => handleToggleStatus(location)}
            />
          )}
        />
      )}

      {deactivateTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">
              Deactivate {deactivateTarget.name}?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Provide a reason for deactivation. This is recorded in the audit
              log.
            </p>
            <textarea
              value={deactivateReason}
              onChange={(event) => setDeactivateReason(event.target.value)}
              rows={3}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Reason for deactivation"
            />
            {statusError && (
              <p className="mt-2 text-sm text-red-600">{statusError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeactivateTarget(null);
                  setDeactivateReason("");
                  setStatusError(null);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm"
                disabled={statusMutation.isPending}
              >
                Cancel
              </button>
              <Button
                type="button"
                onClick={() => void handleConfirmDeactivate()}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}