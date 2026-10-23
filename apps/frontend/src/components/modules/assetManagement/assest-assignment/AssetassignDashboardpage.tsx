"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { useAuth } from "@/providers/auth-provider";
import { assetAssignmentListQueryOptions } from "@/lib/query/asset-assignment-query-options";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import { isDashboardCatalogEmptyState } from "@/lib/hooks/dashboard-list-search-ui";
import {
    ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS,
    sanitizeRestrictedInputValue,
} from "@/lib/forms/restricted-input";
import {
    fetchAssetRegisterVehiclesApi,
    type AssetRegisterVehicleDemandFilter,
} from "@/lib/api/asset-register/vehicles";
import { fetchAllActiveAssetRegisterAssetClassesApi } from "@/lib/api/asset-register/asset-classes";
import { assetRegisterAssetAssignDetailHref } from "@/lib/navigation/asset-register-static-routes";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";

const FLEET_REGISTER_LIST_HREF = "/asset-register/fleetregister/";
const FLEET_REGISTER_CREATE_HREF = "/asset-register/fleetregister/create/";
const BULK_ASSIGN_HREF = "/asset-register/asset-assign/bulk/";

type AssetAssignmentVehicle = {
    id: string;
    fleetCode: string;
    assetClass: string;
    registrationNumber: string;
    chassisNumber: string;
    odometer: number;
    addedToRegisterDate: string;
    openDemandUnitsToAssign: number;
    openDemandContractCount: number;
};

function formatOpenDemandRowLabel(
    units: number,
    contracts: number,
): string | null {
    if (units <= 0 || contracts <= 0) {
        return null;
    }
    const contractLabel =
        contracts === 1 ? "1 contract" : `${contracts} contracts`;
    return `${units} to assign · ${contractLabel}`;
}

const formatOdometer = (value: number) => {
    return `${value.toLocaleString("en-IN")} km`;
};

const PAGE_SIZE = 10;

const DEMAND_FILTER_OPTIONS: {
    label: string;
    value: AssetRegisterVehicleDemandFilter;
}[] = [
    { label: "Any demand", value: "any" },
    { label: "In demand", value: "in_demand" },
    { label: "No open demand", value: "no_demand" },
];

function formatOpenDemandSummaryLine(
    openDemandUnits: number,
    openDemandContractCount: number,
): string | undefined {
    if (openDemandUnits <= 0 || openDemandContractCount <= 0) {
        return undefined;
    }
    const unitLabel =
        openDemandUnits === 1 ? "1 unit" : `${openDemandUnits} units`;
    const contractLabel =
        openDemandContractCount === 1
            ? "1 active contract"
            : `${openDemandContractCount} active contracts`;
    return `${unitLabel} still needed across ${contractLabel} with open allocation demand.`;
}

export default function AssetAssignmentDashboardPage() {
    const router = useRouter();

    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const canAssign =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const canCreateVehicle =
        permissions.has("asset_register.create") ||
        permissions.has("asset_register.manage");

    const { searchInput, setSearchInput, debouncedSearch, clearSearch } =
        useDashboardListSearch();

    const onAssignmentListSearchChange = useCallback(
        (value: string) => {
            setSearchInput(
                sanitizeRestrictedInputValue("text", value, {
                    maxLength:
                        ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.vehicleListSearch,
                }),
            );
        },
        [setSearchInput],
    );

    const [page, setPage] = useState(1);
    const [filterValues, setFilterValues] = useState<Record<string, string>>({
        assetClassId: "",
        demandFilter: "any",
    });

    const demandFilter = (filterValues.demandFilter ||
        "any") as AssetRegisterVehicleDemandFilter;
    const assetClassIdFilter = filterValues.assetClassId || undefined;

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, demandFilter, assetClassIdFilter]);

    const assetClassCatalogQuery = useQuery({
        queryKey: ["asset-register", "asset-classes", "catalog", organizationId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAllActiveAssetRegisterAssetClassesApi({
                token,
                organizationId,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        staleTime: 60_000,
    });

    const assetClassFilterOptions = useMemo(() => {
        const items = assetClassCatalogQuery.data ?? [];
        return [
            { label: "All asset classes", value: "" },
            ...items.map((row) => ({
                label: row.name,
                value: row.id,
            })),
        ];
    }, [assetClassCatalogQuery.data]);

    const selectedAssetClassLabel = useMemo(() => {
        if (!assetClassIdFilter) {
            return undefined;
        }
        return assetClassFilterOptions.find(
            (opt) => opt.value === assetClassIdFilter,
        )?.label;
    }, [assetClassFilterOptions, assetClassIdFilter]);

    const listQuery = useQuery({
        queryKey: [
            "asset-register",
            "vehicles",
            "assignment-available",
            organizationId,
            debouncedSearch,
            page,
            demandFilter,
            assetClassIdFilter,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }

            return fetchAssetRegisterVehiclesApi({
                token,
                organizationId,
                page,
                pageSize: PAGE_SIZE,
                search: debouncedSearch.trim() || undefined,
                operationalStatus: "available",
                status: "active",
                assetClassId: assetClassIdFilter,
                demandFilter,
                includeAssignmentSummary: true,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...assetAssignmentListQueryOptions,
    });

    const vehicles = useMemo((): AssetAssignmentVehicle[] => {
        return (listQuery.data?.items ?? []).map((row) => ({
            id: row.id,
            fleetCode: row.fleetCode,
            assetClass: row.assetClassName,
            registrationNumber: row.registrationNumber,
            chassisNumber: row.chassisNumber,
            odometer: row.odometer,
            addedToRegisterDate: row.addedToRegisterDate,
            openDemandUnitsToAssign: row.openDemandUnitsToAssign,
            openDemandContractCount: row.openDemandContractCount,
        }));
    }, [listQuery.data?.items]);

    const totalItems = listQuery.data?.total ?? 0;

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

    const handleAssign = (vehicle: AssetAssignmentVehicle) => {
        router.push(assetRegisterAssetAssignDetailHref(vehicle.id));
    };

    const handleBulkAssign = () => {
        router.push(BULK_ASSIGN_HREF);
    };

    const isInitialLoading =
        isAuthLoading || (listQuery.isLoading && !listQuery.data);

    const hasActiveFilters =
        !!debouncedSearch.trim() ||
        demandFilter !== "any" ||
        !!assetClassIdFilter;

    const isGlobalEmpty = isDashboardCatalogEmptyState({
        total: totalItems,
        searchInput,
        debouncedSearch,
        hasActiveFilters,
        isFetching: listQuery.isFetching,
    });

    const assignmentSummary = listQuery.data?.assignmentSummary;
    const openDemandSummaryLine =
        assignmentSummary &&
        formatOpenDemandSummaryLine(
            assignmentSummary.openDemandUnits,
            assignmentSummary.openDemandContractCount,
        );

    const globalEmptyDescription = [
        "Vehicles appear here after they are added in Fleet Register, marked active, and set to Available operational status.",
        openDemandSummaryLine,
    ]
        .filter(Boolean)
        .join(" ");

    const handleClearSearch = () => {
        clearSearch();
        setPage(1);
    };

    const handleSearchAllAssetClasses = () => {
        setFilterValues((prev) => ({
            ...prev,
            assetClassId: "",
        }));
        setPage(1);
    };

    const filteredEmptySubtext = useMemo(() => {
        const parts: string[] = [];
        if (selectedAssetClassLabel) {
            parts.push(
                `Asset class filter: ${selectedAssetClassLabel}.`,
            );
        }
        if (demandFilter !== "any") {
            const demandLabel =
                DEMAND_FILTER_OPTIONS.find((opt) => opt.value === demandFilter)
                    ?.label ?? "Demand filter";
            parts.push(`${demandLabel} is applied.`);
        }
        parts.push(
            "Check the registration number or search across all asset classes.",
        );
        return parts.join(" ");
    }, [demandFilter, selectedAssetClassLabel]);

    const filteredEmptyTitle = debouncedSearch.trim()
        ? `No vehicles match '${debouncedSearch.trim()}'`
        : "No vehicles match your filters";

    const assignmentColumns = [
        { key: "fleetCode", label: "FLEET CODE" },
        { key: "registrationNumber", label: "REGISTRATION" },
        { key: "assetClass", label: "ASSET CLASS" },
        { key: "chassisNumber", label: "CHASSIS NO." },
        {
            key: "odometer",
            label: "ODOMETER",
            render: (vehicle: AssetAssignmentVehicle) =>
                formatOdometer(vehicle.odometer),
        },
        {
            key: "addedToRegisterDate",
            label: "ADDED",
            render: (vehicle: AssetAssignmentVehicle) =>
                formatCalendarDateEnIn(vehicle.addedToRegisterDate),
        },
        {
            key: "openDemandUnitsToAssign",
            label: "OPEN DEMAND",
            render: (vehicle: AssetAssignmentVehicle) => {
                const label = formatOpenDemandRowLabel(
                    vehicle.openDemandUnitsToAssign,
                    vehicle.openDemandContractCount,
                );
                if (label) {
                    return (
                        <span className="text-xs font-medium text-gray-800">
                            {label}
                        </span>
                    );
                }
                return (
                    <span className="text-xs text-slate-500">No open demand</span>
                );
            },
        },
    ];

    return (
        <DashboardLayout
            title="Asset Assignment"
            description="Assign available fleet vehicles to active lease contracts."
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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <DashboardFilters
                        searchValue={searchInput}
                        searchPlaceholder="Search by fleet code, registration or asset class"
                        onSearchChange={onAssignmentListSearchChange}
                        selectFilters={[
                            {
                                key: "assetClassId",
                                label: "Asset class",
                                options: assetClassFilterOptions,
                            },
                            {
                                key: "demandFilter",
                                label: "Demand",
                                options: DEMAND_FILTER_OPTIONS.map((opt) => ({
                                    label: opt.label,
                                    value: opt.value,
                                })),
                            },
                        ]}
                        filterValues={filterValues}
                        onFilterChange={(key, value) => {
                            setFilterValues((prev) => ({
                                ...prev,
                                [key]: value,
                            }));
                        }}
                    />
                </div>
                {canAssign ? (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isInitialLoading}
                        className="h-9 shrink-0 rounded-md border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={handleBulkAssign}
                    >
                        Bulk assign
                    </Button>
                ) : null}
            </div>

            {listQuery.isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    Could not load vehicles.{" "}
                    <button
                        type="button"
                        className="underline"
                        onClick={() => void listQuery.refetch()}
                    >
                        Retry
                    </button>
                </div>
            ) : isInitialLoading ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                    Loading available vehicles…
                </div>
            ) : isGlobalEmpty ? (
                <div className="w-full rounded-lg border border-gray-200 bg-white">
                    <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-8 text-center">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center text-gray-400">
                            <PackageSearch
                                className="h-7 w-7"
                                strokeWidth={1.4}
                            />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            No vehicles available for assignment
                        </h3>
                        <p className="mt-1 max-w-lg text-xs text-gray-500">
                            {globalEmptyDescription}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-md border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                onClick={() =>
                                    router.push(FLEET_REGISTER_LIST_HREF)
                                }
                            >
                                Open Fleet Register
                            </Button>
                            {canCreateVehicle ? (
                                <Button
                                    type="button"
                                    className="h-9 rounded-md px-4 text-sm font-medium"
                                    onClick={() =>
                                        router.push(FLEET_REGISTER_CREATE_HREF)
                                    }
                                >
                                    Add vehicle
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : vehicles.length === 0 ? (
                <div className="w-full rounded-lg border border-gray-200 bg-white">
                    <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-8 text-center">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center text-gray-400">
                            <PackageSearch
                                className="h-7 w-7"
                                strokeWidth={1.4}
                            />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            {filteredEmptyTitle}
                        </h3>
                        <p className="mt-1 max-w-lg text-xs text-gray-500">
                            {filteredEmptySubtext}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                            {searchInput.trim() ? (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="text-xs font-medium text-[#FE5720] hover:underline"
                                >
                                    Clear search
                                </button>
                            ) : null}
                            {assetClassIdFilter ? (
                                <button
                                    type="button"
                                    onClick={handleSearchAllAssetClasses}
                                    className="text-xs font-medium text-[#FE5720] hover:underline"
                                >
                                    Search all asset classes
                                </button>
                            ) : null}
                            {!searchInput.trim() && !assetClassIdFilter ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterValues({
                                            assetClassId: "",
                                            demandFilter: "any",
                                        });
                                        clearSearch();
                                        setPage(1);
                                    }}
                                    className="text-xs font-medium text-[#FE5720] hover:underline"
                                >
                                    Clear filters
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : (
                <DashboardTable
                    columns={assignmentColumns}
                    data={vehicles}
                    getRowKey={(vehicle) => vehicle.id}
                    renderActions={(vehicle) => (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!canAssign}
                            onClick={() => handleAssign(vehicle)}
                            className="h-9 rounded-md border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Assign
                        </Button>
                    )}
                />
            )}
        </DashboardLayout>
    );
}
