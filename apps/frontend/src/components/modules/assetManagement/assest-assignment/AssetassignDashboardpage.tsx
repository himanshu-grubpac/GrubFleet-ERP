"use client";

import { useMemo, useState } from "react";
import { Search, PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { fetchAssetRegisterVehiclesApi } from "@/lib/api/asset-register/vehicles";

type AssetAssignmentVehicle = {
    id: string;
    fleetCode: string;
    assetClass: string;
    registrationNumber: string;
    odometer: number;
    availableSince: string;
};

const formatOdometer = (value: number) => {
    return `${value.toLocaleString("en-IN")} km`;
};

const PAGE_SIZE = 50;

export default function AssetAssignmentDashboardPage() {
    const router = useRouter();
    const { token, organizationId, isLoading: isAuthLoading, permissions } =
        useAuth();

    const canAssign =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 300);

    const listQuery = useQuery({
        queryKey: [
            "asset-register",
            "vehicles",
            "assignment-available",
            organizationId,
            debouncedSearch,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterVehiclesApi({
                token,
                organizationId,
                page: 1,
                pageSize: PAGE_SIZE,
                search: debouncedSearch.trim() || undefined,
                operationalStatus: "available",
                status: "active",
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const vehicles = useMemo((): AssetAssignmentVehicle[] => {
        return (listQuery.data?.items ?? []).map((row) => ({
            id: row.id,
            fleetCode: row.fleetCode,
            assetClass: row.assetClassName,
            registrationNumber: row.registrationNumber,
            odometer: row.odometer,
            availableSince: "—",
        }));
    }, [listQuery.data?.items]);

    const handleAssign = (vehicle: AssetAssignmentVehicle) => {
        router.push(`/asset-register/asset-assign/${vehicle.id}`);
    };

    const isInitialLoading =
        isAuthLoading || (listQuery.isLoading && !listQuery.data);
    const isEmpty =
        !isInitialLoading &&
        !listQuery.isError &&
        (listQuery.data?.total ?? 0) === 0 &&
        !debouncedSearch.trim();

    const assignmentColumns = [
        { key: "fleetCode", label: "FLEET CODE" },
        { key: "assetClass", label: "ASSET CLASS" },
        { key: "registrationNumber", label: "REGISTRATION NO." },
        {
            key: "odometer",
            label: "ODOMETER",
            render: (vehicle: AssetAssignmentVehicle) =>
                formatOdometer(vehicle.odometer),
        },
        { key: "availableSince", label: "AVAILABLE SINCE" },
    ];

    return (
        <DashboardLayout
            title="Asset Assignment"
            description="Assign available fleet vehicles to active lease contracts."
        >
            <div className="mb-4 flex items-center gap-3">
                <div className="relative min-w-0 flex-1">
                    <Search
                        className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                        strokeWidth={1.8}
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by fleet code, registration or asset class"
                        className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                    />
                </div>
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
            ) : isEmpty ? (
                <DashboardEmptyState
                    icon={
                        <PackageSearch className="h-7 w-7" strokeWidth={1.4} />
                    }
                    title="No vehicles available for assignment"
                    description="Vehicles must be active and in Available status to appear here."
                />
            ) : vehicles.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
                    <PackageSearch
                        className="mb-3 h-7 w-7 text-gray-400"
                        strokeWidth={1.4}
                    />
                    <h3 className="text-sm font-semibold text-gray-900">
                        No vehicles found
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                        Try changing your search.
                    </p>
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
