"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Search } from "lucide-react";
import DashboardAssetClassTableCell from "@/components/dashboard/DashboardAssetClassTableCell";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { ASSET_REGISTER_VEHICLE_COLUMN_SORT } from "@/lib/query/dashboard-list-column-sort-maps";
import {
    listSortQueryKeyPart,
    useDashboardTableListSort,
} from "@/lib/query/dashboard-table-list-sort";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import {
    ASSET_REGISTER_VEHICLE_INPUT_LIMITS,
    sanitizeRestrictedInputValue,
} from "@/lib/forms/restricted-input";
import { fetchAssetRegisterVehiclesApi } from "@/lib/api/asset-register/vehicles";
import {
    assetRegisterFleetDetailHref,
    assetRegisterFleetEditHref,
} from "@/lib/navigation/asset-register-static-routes";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import {
    DashboardDetailErrorShell,
    DashboardListLoadingShell,
} from "@/components/dashboard/dashboard-async-states";

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

const FLEET_FILTERS: {
    label: string;
    value: FleetFilter;
}[] = [
        { label: "All", value: "all" },
        { label: "Available", value: "available" },
        { label: "Leased", value: "leased" },
        { label: "Workshop", value: "workshop" },
        { label: "Sold", value: "sold" },
    ];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 50;

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
    const [copiedAssetClass, setCopiedAssetClass] = useState<string | null>(null);

    const handleCopyAssetClass = async (name: string) => {
        try {
            await navigator.clipboard.writeText(name);
            setCopiedAssetClass(name);

            window.setTimeout(() => {
                setCopiedAssetClass((current) =>
                    current === name ? null : current,
                );
            }, 1500);
        } catch {
            // Clipboard access may be unavailable in an insecure context.
        }
    };

    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
    } = useAuth();

    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const { searchInput, setSearchInput, debouncedSearch } =
        useDashboardListSearch();

    const onFleetListSearchChange = useCallback(
        (value: string) => {
            setSearchInput(
                sanitizeRestrictedInputValue("text", value, {
                    maxLength: ASSET_REGISTER_VEHICLE_INPUT_LIMITS.listSearch,
                }),
            );
        },
        [setSearchInput],
    );

    const [activeFilter, setActiveFilter] =
        useState<FleetFilter>("all");

    const [page, setPage] = useState(1);

    const {
        sort: tableSort,
        onSortChange,
        listSortParams,
        serverSorted,
    } = useDashboardTableListSort(ASSET_REGISTER_VEHICLE_COLUMN_SORT);

    // Reset pagination when the search or filter changes.
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, activeFilter, tableSort]);

    const listQuery = useQuery({
        queryKey: [
            "asset-register",
            "vehicles",
            organizationId,
            debouncedSearch,
            activeFilter,
            page,
            ...listSortQueryKeyPart(listSortParams),
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
                page,
                pageSize: PAGE_SIZE,
                search: debouncedSearch.trim() || undefined,
                operationalStatus,
                status: "active",
                ...listSortParams,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const totalItems = listQuery.data?.total ?? 0;

    const totalPages = Math.max(
        1,
        Math.ceil(totalItems / PAGE_SIZE),
    );

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
        navigateToEntityShell(router, assetRegisterFleetEditHref(vehicle.id), vehicle.id, 'push');
    };

    /* ---------------------------------------------------------------------- */
    /* Filtering                                                              */
    /* ---------------------------------------------------------------------- */

    /** Server applies search + operationalStatus — avoid double client-side filter. */
    const filteredVehicles = apiVehicles;

    const isInitialLoading =
        isAuthLoading || (listQuery.isLoading && !listQuery.data);

    const isEmptyOrgList =
        !isInitialLoading &&
        !listQuery.isError &&
        totalItems === 0 &&
        activeFilter === "all" &&
        !debouncedSearch.trim();

    /* ---------------------------------------------------------------------- */
    /* Clear Filters                                                          */
    /* ---------------------------------------------------------------------- */

    const handleClearFilters = () => {
        setSearchInput("");
        setActiveFilter("all");
        setPage(1);
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                          */
    /* ---------------------------------------------------------------------- */

    const fleetColumns = [
        {
            key: "fleetCode",
            label: "FLEET CODE",
            width: "20%",
        },
        {
            key: "assetClass",
            label: "ASSET CLASS",
            sortable: false,
            className: "w-[180px] max-w-[180px]",
            render: (vehicle: FleetVehicle) => (
                <DashboardAssetClassTableCell
                    assetClass={vehicle.assetClass}
                    copied={copiedAssetClass === vehicle.assetClass}
                    onCopy={() => void handleCopyAssetClass(vehicle.assetClass)}
                />
            ),
        },
        {
            key: "registrationNumber",
            label: "REGISTRATION NO.",
            width: "20%",
        },
        {
            key: "odometer",
            label: "ODOMETER",
            sortable: false,
            width: "20%",
            render: (vehicle: FleetVehicle) => (
                <span className="text-gray-700">
                    {formatOdometer(vehicle.odometer)}
                </span>
            ),
        },
        {
            key: "status",
            label: "STATUS",
            width: "20%",
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
            pagination={
                totalItems > 0
                    ? {
                        currentPage: page,
                        totalPages,
                        totalItems,
                        pageSize: PAGE_SIZE,
                        onPageChange: setPage,
                    }
                    : undefined
            }
        >
            {/* Filters */}
            <div className="mb-4 flex items-center gap-3">
                <div className="relative min-w-0 flex-1">
                    <Search
                        className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                        strokeWidth={1.8}
                    />

                    <input
                        type="search"
                        value={searchInput}
                        maxLength={ASSET_REGISTER_VEHICLE_INPUT_LIMITS.listSearch}
                        onChange={(event) =>
                            onFleetListSearchChange(event.target.value)
                        }
                        placeholder="Search by fleet code or registration number"
                        className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                    />
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    {FLEET_FILTERS.map((filter) => {
                        const isActive = activeFilter === filter.value;

                        return (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() => setActiveFilter(filter.value)}
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

            {/* Empty / Table */}
            {listQuery.isError ? (
                <DashboardDetailErrorShell
                    title="Failed to load fleet register"
                    error={listQuery.error}
                    fallbackMessage="Could not load fleet register."
                    onRetry={() => void listQuery.refetch()}
                />
            ) : isInitialLoading ? (
                <DashboardListLoadingShell label="Loading fleet register…" />
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
                    sortState={tableSort}
                    onSortChange={onSortChange}
                    serverSorted={serverSorted}
                    getRowKey={(vehicle) => vehicle.id}

                    renderActions={(vehicle) => (
                        <DashboardTableActions
                            status={
                                vehicle.status === "sold"
                                    ? "inactive"
                                    : "active"
                            }
                            locationId={vehicle.id}
                            navigationEntityId={vehicle.id}
                            viewHref={assetRegisterFleetDetailHref(vehicle.id)}
                            copyText={[
                                `Vehicle ID: ${vehicle.id}`,
                                `Fleet Code: ${vehicle.fleetCode}`,
                                `Asset Class: ${vehicle.assetClass}`,
                                `Registration Number: ${vehicle.registrationNumber}`,
                                `Odometer: ${formatOdometer(vehicle.odometer)}`,
                                `Status: ${getStatusLabel(vehicle.status)}`,
                            ].join("\n")}
                            onEdit={() => handleEdit(vehicle)}
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