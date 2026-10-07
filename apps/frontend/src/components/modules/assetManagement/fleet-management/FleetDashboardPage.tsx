"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { fetchAssetRegisterVehiclesApi } from "@/lib/api/asset-register/vehicles";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type FleetStatus =
    | "available"
    | "leased"
    | "workshop"
    | "sold";

type FleetVehicle = {
    id: string;

    fleetCode: string;

    assetClass: string;

    registrationNumber: string;

    odometer: number;

    status: FleetStatus;

    /* Registration */
    registrationStartDate?: string;
    registrationEndDate?: string;

    /* Warranty */
    warrantyStartDate?: string;
    warrantyEndDate?: string;

    /* Insurance */
    insuranceSupplier?: string;
    insuranceRenewalDate?: string;

    /* Workshop */
    workshopName?: string;
    workshopStartDate?: string;
    workshopEndDate?: string;

    /* Lease */
    leasedTo?: string;
    leaseStartDate?: string;
    leaseEndDate?: string;

    /* Sold */
    soldTo?: string;
    soldDate?: string;
};

/* -------------------------------------------------------------------------- */
/* Filter Types                                                               */
/* -------------------------------------------------------------------------- */

type FleetFilter =
    | "all"
    | "available"
    | "leased"
    | "workshop"
    | "sold";

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

const FLEET_FILTERS: {
    label: string;
    value: FleetFilter;
}[] = [
        {
            label: "All",
            value: "all",
        },
        {
            label: "Available",
            value: "available",
        },
        {
            label: "Leased",
            value: "leased",
        },
        {
            label: "Workshop",
            value: "workshop",
        },
        {
            label: "Sold",
            value: "sold",
        },
    ];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatOdometer = (value: number) => {
    return `${value.toLocaleString("en-IN")} km`;
};

const getStatusLabel = (status: FleetStatus) => {
    switch (status) {
        case "available":
            return "Available";

        case "leased":
            return "Leased";

        case "workshop":
            return "Workshop";

        case "sold":
            return "Sold";

        default:
            return status;
    }
};

const getStatusClass = (status: FleetStatus) => {
    switch (status) {
        case "available":
            return "bg-green-50 text-green-700";

        case "leased":
            return "bg-blue-50 text-blue-700";

        case "workshop":
            return "bg-orange-50 text-orange-700";

        case "sold":
            return "bg-gray-100 text-gray-600";

        default:
            return "bg-gray-100 text-gray-600";
    }
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function FleetDashboardPage() {
    const router = useRouter();
    const { token, organizationId, isLoading: isAuthLoading } = useAuth();

    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 300);

    const [activeFilter, setActiveFilter] =
        useState<FleetFilter>("all");

    const listQuery = useQuery({
        queryKey: [
            "asset-register",
            "vehicles",
            organizationId,
            debouncedSearch,
            activeFilter,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            const operationalStatus =
                activeFilter === "all"
                    ? undefined
                    : activeFilter === "sold"
                      ? "sold"
                      : activeFilter;
            return fetchAssetRegisterVehiclesApi({
                token,
                organizationId,
                page: 1,
                pageSize: 50,
                search: debouncedSearch.trim() || undefined,
                operationalStatus,
                status: "active",
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const apiVehicles = useMemo((): FleetVehicle[] => {
        return (listQuery.data?.items ?? []).map((row) => ({
            id: row.id,
            fleetCode: row.fleetCode,
            assetClass: row.assetClassName,
            registrationNumber: row.registrationNumber,
            odometer: row.odometer,
            status:
                row.operationalStatus === "retired"
                    ? "sold"
                    : (row.operationalStatus as FleetStatus),
        }));
    }, [listQuery.data?.items]);

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                             */
    /* ---------------------------------------------------------------------- */

    const handleAddVehicle = () => {
        router.push("/asset-register/fleetregister/create");
    };

    const handleEdit = (vehicle: FleetVehicle) => {
        router.push(`/asset-register/fleetregister/${vehicle.id}/edit`);
    };

    /* ---------------------------------------------------------------------- */
    /* Filtering                                                              */
    /* ---------------------------------------------------------------------- */

    const filteredVehicles = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return apiVehicles.filter((vehicle) => {
            const matchesSearch =
                !searchValue ||
                vehicle.fleetCode
                    .toLowerCase()
                    .includes(searchValue) ||
                vehicle.assetClass
                    .toLowerCase()
                    .includes(searchValue) ||
                vehicle.registrationNumber
                    .toLowerCase()
                    .includes(searchValue);

            let matchesFilter = true;

            switch (activeFilter) {
                case "available":
                    matchesFilter =
                        vehicle.status === "available";
                    break;

                case "leased":
                    matchesFilter =
                        vehicle.status === "leased";
                    break;

                case "workshop":
                    matchesFilter =
                        vehicle.status === "workshop";
                    break;

                case "sold":
                    matchesFilter =
                        vehicle.status === "sold";
                    break;

                case "all":
                default:
                    matchesFilter = true;
                    break;
            }

            return matchesSearch && matchesFilter;
        });
    }, [search, activeFilter, apiVehicles]);

    const isInitialLoading =
        isAuthLoading || (listQuery.isLoading && !listQuery.data);
    const isEmptyOrgList =
        !isInitialLoading &&
        !listQuery.isError &&
        (listQuery.data?.total ?? 0) === 0 &&
        activeFilter === "all" &&
        !debouncedSearch.trim();

    /* ---------------------------------------------------------------------- */
    /* Clear Filters                                                          */
    /* ---------------------------------------------------------------------- */

    const handleClearFilters = () => {
        setSearch("");
        setActiveFilter("all");
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                          */
    /* ---------------------------------------------------------------------- */

    const fleetColumns = [
        {
            key: "fleetCode",
            label: "FLEET CODE",
        },

        {
            key: "assetClass",
            label: "ASSET CLASS",
        },

        {
            key: "registrationNumber",
            label: "REGISTRATION NO.",
        },

        {
            key: "odometer",
            label: "ODOMETER",
            render: (vehicle: FleetVehicle) => (
                <span className="text-gray-700">
                    {formatOdometer(vehicle.odometer)}
                </span>
            ),
        },

        {
            key: "status",
            label: "STATUS",
            render: (vehicle: FleetVehicle) => (
                <span
                    className={[
                        "inline-flex rounded-full px-2.5 py-1",
                        "text-xs font-medium",
                        getStatusClass(vehicle.status),
                    ].join(" ")}
                >
                    {getStatusLabel(vehicle.status)}
                </span>
            ),
        },
    ];

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <DashboardLayout
            title="Fleet Register"
            description="Every vehicle owned by the fleet, across all asset classes."
            activeTab="/asset-register/fleetregister"
            action={
                <Button
                    type="button"
                    onClick={handleAddVehicle}
                >
                    + Add Vehicle
                </Button>
            }
        >
            {/* ---------------------------------------------------------------- */}
            {/* Filters                                                           */}
            {/* ---------------------------------------------------------------- */}

            <div className="mb-4 flex items-center gap-3">
                {/* Search */}
                <div className="relative min-w-0 flex-1">
                    <Search
                        className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                        strokeWidth={1.8}
                    />

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search by fleet code or registration number"
                        className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                    />
                </div>

                {/* Filters */}
                <div className="flex shrink-0 items-center gap-1.5">
                    {FLEET_FILTERS.map((filter) => {
                        const isActive =
                            activeFilter === filter.value;

                        return (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() =>
                                    setActiveFilter(filter.value)
                                }
                                className={[
                                    "h-8 rounded-md border px-3",
                                    "text-xs font-medium",
                                    "transition-colors",

                                    isActive
                                        ? "border-gray-900 bg-gray-900 text-white"
                                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                                ].join(" ")}
                            >
                                {filter.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Empty / Table                                                     */}
            {/* ---------------------------------------------------------------- */}

            {listQuery.isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    Could not load fleet register.{" "}
                    <button
                        type="button"
                        className="font-medium underline"
                        onClick={() => void listQuery.refetch()}
                    >
                        Retry
                    </button>
                </div>
            ) : isInitialLoading ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                    Loading fleet register…
                </div>
            ) : isEmptyOrgList ? (
                <DashboardEmptyState
                    icon={
                        <CarFront
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No vehicles added yet"
                    description="Add your first vehicle to start building the fleet register."
                    buttonLabel="Add Vehicle"
                    onButtonClick={handleAddVehicle}
                />
            ) : filteredVehicles.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
                    <CarFront
                        className="mb-3 h-7 w-7 text-gray-400"
                        strokeWidth={1.4}
                    />

                    <h3 className="text-sm font-semibold text-gray-900">
                        No vehicles found
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
                <DashboardTable
                    columns={fleetColumns}
                    data={filteredVehicles}
                    getRowKey={(vehicle) => vehicle.id}
                    renderActions={(vehicle) => (
                        <DashboardTableActions
                            status={
                                vehicle.status === "sold"
                                    ? "inactive"
                                    : "active"
                            }
                            locationId={vehicle.id}
                            viewHref={`/asset-register/fleetregister/${vehicle.id}`}
                            onEdit={() =>
                                handleEdit(vehicle)
                            }
                            onToggleStatus={() => {
                                console.log(
                                    "Toggle vehicle status:",
                                    vehicle.id,
                                );
                            }}
                        />
                    )}
                />
            )}
        </DashboardLayout>
    );
}
