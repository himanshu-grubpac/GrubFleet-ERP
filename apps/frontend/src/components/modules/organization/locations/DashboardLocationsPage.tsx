"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MapPin, Smartphone } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dashboardCatalogQueryOptions,
  dashboardListQueryOptions,
} from "@/lib/query/dashboard-list-query-options";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import ContactCopyIcon from "@/components/ui/ContactCopyIcon";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationLocationsApi,
  updateOrganisationLocationStatusApi,
  type OrganisationLocationListItem,
} from "@/lib/api/organisation/locations";
import { fetchOrganisationLocationTypesApi } from "@/lib/api/organisation/location-types";
import {
  LOCATION_STATUS_UPDATE_ERROR,
  showErrorToast,
  showLocationActivatedToast,
  showLocationDeactivatedToast,
} from "@/lib/toast/show-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { formatLocationRowCopyText } from "@/components/dashboard/dashboard-row-copy-text";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";
import {
  isDashboardCatalogEmptyState,
  shouldShowDashboardListFilters,
} from "@/lib/hooks/dashboard-list-search-ui";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";

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

  const { searchInput, setSearchInput, debouncedSearch } =
    useDashboardListSearch();
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
    ...dashboardCatalogQueryOptions,
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
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
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
    router.push("/organization/locations/create");
  };

  const addLocationAction = canCreate ? (
    <Button type="button" onClick={handleAddLocation}>
      + Add Location
    </Button>
  ) : undefined;

  const handleEdit = (location: Location) => {
    router.push(
      `/organization/locations/${location.id}/edit`
    );
  };

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
    setSearchInput("");

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
      key: "email",
      label: "Email",
      render: (location: Location) => (
        <ContactCopyIcon
          value={location.email}
          label="email"
          icon={Mail}
        />
      ),
    },

    {
      key: "phone",
      label: "Mobile",
      render: (location: Location) => (
        <ContactCopyIcon
          value={location.phone}
          label="mobile number"
          icon={Smartphone}
          copyKind="phone"
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

  const hasActiveSelectFilters =
    filters.type !== "" || filters.status !== "";

  const showFilters = shouldShowDashboardListFilters({
    total: locationsTotal,
    searchInput,
    debouncedSearch,
    hasActiveSelectFilters,
    isFetchingWithPlaceholder:
      locationsQuery.isFetching && locationsQuery.isPlaceholderData,
  });

  const isEmptyOrganisation = isDashboardCatalogEmptyState({
    total: locationsTotal,
    searchInput,
    debouncedSearch,
    hasActiveFilters: hasActiveSelectFilters,
    isFetching: locationsQuery.isFetching,
  });

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
      action={addLocationAction}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Filters                                                            */}
      {/* ------------------------------------------------------------------ */}

      {showFilters && (
        <DashboardFilters
          searchValue={searchInput}
          searchPlaceholder="Search locations..."
          onSearchChange={setSearchInput}
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

      {isEmptyOrganisation ? (
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
      ) : locations.length === 0 ? (
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
        <>
          <div
            className={
              locationsQuery.isFetching && !isInitialLoading
                ? "opacity-60 transition-opacity"
                : undefined
            }
            aria-busy={locationsQuery.isFetching}
          >
            <DashboardTable
              columns={locationColumns}
              data={locations}
              getRowKey={(location) => location.id}
              renderActions={(location) => (
                <DashboardTableActions
                  status={location.status}
                  locationId={location.id}
                  copyText={formatLocationRowCopyText(location)}
                  onEdit={
                    canUpdate ? () => handleEdit(location) : undefined
                  }
                  onDeactivate={
                    canUpdate
                      ? () => handleDeactivate(location)
                      : undefined
                  }
                  onActivate={
                    canUpdate ? () => handleActivate(location) : undefined
                  }
                />
              )}
            />
          </div>
          <DashboardTablePagination
            page={locationsPage}
            pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
            total={locationsTotal}
            onPageChange={setPage}
            disabled={
              locationsQuery.isFetching || statusMutation.isPending
            }
          />
        </>
      )}

      <ConfirmDialog
        open={activateTarget !== null}
        title={
          activateTarget
            ? `Activate ${activateTarget.name}?`
            : "Activate location?"
        }
        message="This location will be marked active and available for use across the organisation."
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