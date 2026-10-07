"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  LOCATION_STATUS_UPDATE_ERROR,
  showErrorToast,
  showLocationActivatedToast,
  showLocationDeactivatedToast,
} from "@/lib/toast/show-toast";
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
import {
  organisationLocationDetailHref,
  organisationLocationEditHref,
} from "@/lib/navigation/organisation-static-routes";
import { formatLocationRowCopyText } from "@/components/dashboard/dashboard-row-copy-text";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardContact from "@/components/dashboard/DashboardContact";
import { formatPhoneDisplay } from "@/lib/format/phone-format";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Location = OrganisationLocationListItem;

const LOCATIONS_PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function LocationsPage() {
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

  const [deactivateTarget, setDeactivateTarget] =
    useState<Location | null>(null);
  const [activateTarget, setActivateTarget] = useState<Location | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.type]);

  const locationsQuery = useQuery({
    queryKey: [
      "organization",
      "locations",
      organizationId,
      debouncedSearch,
      filters.status,
      selectedTypeId,
      page,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationLocationsApi(token, {
        organizationId,
        page,
        pageSize: LOCATIONS_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        locationTypeId: selectedTypeId,
        status:
          filters.status === "active" || filters.status === "inactive"
            ? filters.status
            : undefined,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const locations = locationsQuery.data?.items ?? [];
  const locationsTotal = locationsQuery.data?.total ?? 0;
  const locationsPage = locationsQuery.data?.page ?? page;
  const totalPages = Math.max(
    1,
    Math.ceil(locationsTotal / LOCATIONS_PAGE_SIZE),
  );
  const filteredLocations = locations;

  const isInitialLoading =
    isAuthLoading ||
    (locationsQuery.isLoading && !locationsQuery.data);

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
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "locations"],
      });
      setDeactivateTarget(null);
      setActivateTarget(null);
      setStatusError(null);
      if (variables.action === "activate") {
        showLocationActivatedToast(variables.location.name);
      } else {
        showLocationDeactivatedToast(variables.location.name);
      }
    },
    onError: (error: Error) => {
      const message = error.message || LOCATION_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                               */
  /* ------------------------------------------------------------------------ */

  const handleAddLocation = () => {
    if (!canCreate) return;
    router.push(
      "/organization/locations/create"
    );
  };

  const addLocationAction = canCreate ? (
    <Button type="button" onClick={handleAddLocation}>
      + Add Location
    </Button>
  ) : undefined;

  const handleEdit = (location: Location) => {
    router.push(organisationLocationEditHref(location.id));
  };

  /* ------------------------------------------------------------------------ */
  /* Copy                                                                     */
  /* ------------------------------------------------------------------------ */

  const handleActivate = (location: Location) => {
    setStatusError(null);
    setActivateTarget(location);
  };

  const handleConfirmActivate = async () => {
    if (!activateTarget) return;
    await statusMutation.mutateAsync({
      location: activateTarget,
      action: "activate",
    });
  };

  const handleDeactivate = (location: Location) => {
    setStatusError(null);
    setDeactivateTarget(location);
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
          phone={formatPhoneDisplay(location.phone) || undefined}
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

  if (isInitialLoading) {
    return (
      <DashboardLayout
        title="Locations"
        description="The organisation's physical footprint — offices, workshops, warehouses, retail outlets, and more."
        action={addLocationAction}
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
        action={addLocationAction}
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
      activeTab="/organization/locations"
      action={addLocationAction}
      pagination={
        locationsTotal > LOCATIONS_PAGE_SIZE
          ? {
              currentPage: locationsPage,
              totalPages,
              totalItems: locationsTotal,
              pageSize: LOCATIONS_PAGE_SIZE,
              onPageChange: setPage,
            }
          : undefined
      }
    >
      {/* ------------------------------------------------------------------ */}
      {/* Filters                                                            */}
      {/* ------------------------------------------------------------------ */}

      {locationsTotal > 0 && (
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

      {locationsTotal === 0 &&
      !debouncedSearch &&
      !filters.type &&
      !filters.status ? (
        <DashboardEmptyState
          icon={
            <MapPin
              className="h-7 w-7"
              strokeWidth={1.4}
            />
          }
          title="No locations added yet"
          description="Add your first office, workshop, warehouse, or outlet."
          buttonLabel={canCreate ? "Add Location" : undefined}
          onButtonClick={canCreate ? handleAddLocation : undefined}
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

        <>
          <DashboardTable
            columns={locationColumns}
            data={filteredLocations}
            getRowKey={(location) => location.id}
            renderActions={(location) => (
              <DashboardTableActions
                status={location.status}
                locationId={location.id}
                copyText={formatLocationRowCopyText(location)}
                viewHref={organisationLocationDetailHref(location.id)}
                onEdit={
                  canUpdate && location.status === "active"
                    ? () => handleEdit(location)
                    : undefined
                }
                onToggleStatus={
                  canUpdate
                    ? () =>
                        location.status === "active"
                          ? handleDeactivate(location)
                          : handleActivate(location)
                    : undefined
                }
              />
            )}
          />
        </>
      )}

      <ConfirmDialog
        open={activateTarget !== null}
        title="Activate location?"
        message={
          activateTarget
            ? `${activateTarget.name} will be marked active and available for use across the organisation.`
            : "This location will be marked active."
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateTarget(null);
            setStatusError(null);
          }
        }}
        onConfirm={() => void handleConfirmActivate()}
      />

      <ReasonRequiredDialog
        open={deactivateTarget !== null}
        title="Deactivate location?"
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
          setDeactivateTarget(null);
          setStatusError(null);
        }}
        onConfirm={(reason) => {
          if (!deactivateTarget) return;
          void statusMutation.mutateAsync({
            location: deactivateTarget,
            action: "deactivate",
            reason,
          });
        }}
      />
    </DashboardLayout>
  );
}