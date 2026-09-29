"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type LocationStatus = "active" | "inactive";

type Location = {
  id: string;
  name: string;
  type: string;
  address: string;
  responsiblePerson: string;
  email: string;
  phone: string;
  status: LocationStatus;
};

/* -------------------------------------------------------------------------- */
/* MOCK LOCATION DATA                                                         */
/* -------------------------------------------------------------------------- */
/*
 * TEMPORARY MOCK DATA
 *
 * The Locations backend API is not built yet.
 * Therefore, this dashboard uses the following mock records.
 *
 * Later, when the API is ready, replace the React Query queryFn
 * with the real API request.
 */

const MOCK_LOCATIONS: Location[] = [
  {
    id: "loc-001",
    name: "Delhi Head Office",
    type: "Office",
    address: "Connaught Place, New Delhi",
    responsiblePerson: "Rahul Sharma",
    email: "rahul@grubpac.com",
    phone: "+91 98765 43210",
    status: "active",
  },

];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function LocationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
  /*
   * MOCK DATA IS USED HERE
   *
   * There is NO API call here.
   */

  const locationsQuery = useQuery({
    queryKey: ["organization", "locations"],

    queryFn: async () => {
      return MOCK_LOCATIONS;
    },
  });

  const locations = locationsQuery.data ?? [];

  /* ------------------------------------------------------------------------ */
  /* Filter Locations                                                         */
  /* ------------------------------------------------------------------------ */

  const filteredLocations = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return locations.filter((location) => {
      const matchesSearch =
        !searchValue ||
        location.name
          .toLowerCase()
          .includes(searchValue) ||
        location.type
          .toLowerCase()
          .includes(searchValue) ||
        location.address
          .toLowerCase()
          .includes(searchValue) ||
        location.responsiblePerson
          .toLowerCase()
          .includes(searchValue) ||
        location.email
          .toLowerCase()
          .includes(searchValue) ||
        location.phone
          .toLowerCase()
          .includes(searchValue);

      const matchesType =
        !filters.type ||
        location.type.toLowerCase() ===
        filters.type.toLowerCase();

      const matchesStatus =
        !filters.status ||
        location.status === filters.status;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    });
  }, [locations, search, filters]);

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                               */
  /* ------------------------------------------------------------------------ */

  const handleAddLocation = () => {
    router.push(
      "/organization/locations/create"
    );
  };

  const handleView = (location: Location) => {
    router.push(
      `/organization/locations/${location.id}`
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

  /* ------------------------------------------------------------------------ */
  /* Activate                                                                 */
  /* ------------------------------------------------------------------------ */
  /*
   * MOCK BEHAVIOR
   *
   * Since the backend API does not exist yet,
   * activation is handled locally using React Query.
   */

  const handleActivate = async (
    location: Location
  ) => {
    queryClient.setQueryData<Location[]>(
      ["organization", "locations"],
      (currentLocations = []) =>
        currentLocations.map((item) =>
          item.id === location.id
            ? {
              ...item,
              status: "active",
            }
            : item
        )
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Deactivate                                                               */
  /* ------------------------------------------------------------------------ */
  /*
   * MOCK BEHAVIOR
   *
   * This only changes the status locally.
   */

  const handleDeactivate = async (
    location: Location
  ) => {
    queryClient.setQueryData<Location[]>(
      ["organization", "locations"],
      (currentLocations = []) =>
        currentLocations.map((item) =>
          item.id === location.id
            ? {
              ...item,
              status: "inactive",
            }
            : item
        )
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Toggle Status                                                            */
  /* ------------------------------------------------------------------------ */

  const handleToggleStatus = async (
    location: Location
  ) => {
    if (location.status === "active") {
      await handleDeactivate(location);
    } else {
      await handleActivate(location);
    }
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
      key: "email",
      label: "Email",
    },

    {
      key: "phone",
      label: "Phone",
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

  if (locationsQuery.isLoading) {
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
              options: [
                {
                  label: "Office",
                  value: "office",
                },
                {
                  label: "Workshop",
                  value: "workshop",
                },
                {
                  label: "Warehouse",
                  value: "warehouse",
                },
                {
                  label: "Outlet",
                  value: "outlet",
                },
              ],
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
              onCopy={() => handleCopy(location)}
              onEdit={() => handleEdit(location)}
              onToggleStatus={() => handleToggleStatus(location)}
            />
          )}
        />
      )}
    </DashboardLayout>
  );
}