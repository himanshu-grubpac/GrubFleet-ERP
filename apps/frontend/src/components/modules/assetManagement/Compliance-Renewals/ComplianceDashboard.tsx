"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { fetchAssetRegisterComplianceListApi } from "@/lib/api/asset-register/compliance";
import { assetRegisterComplianceRenewalDetailHref } from "@/lib/navigation/asset-register-static-routes";

import {
    formatAssetRegisterIsoDate,
    mapComplianceFilterToApi,
    mapComplianceStatusToUi,
} from "@/lib/api/asset-register/mappers";

type ComplianceStatus = "Expired" | "Expiring Soon" | "Valid";

type ComplianceItem = {
    id: string;
    fleetCode: string;
    assetClass: string;
    insuranceExpiry: string;
    registrationExpiry: string;
    warrantyExpiry: string;
    status: ComplianceStatus;
};

const STATUS_FILTERS: Array<"All" | ComplianceStatus> = [
    "All",
    "Expired",
    "Expiring Soon",
    "Valid",
];

const PAGE_SIZE = 50;

function getStatusClasses(status: ComplianceStatus) {
    switch (status) {
        case "Expired":
            return "bg-red-50 text-red-700";
        case "Expiring Soon":
            return "bg-yellow-50 text-yellow-700";
        case "Valid":
            return "bg-green-50 text-green-700";
        default:
            return "bg-gray-100 text-gray-500";
    }
}

export default function ComplianceDashboardPage() {
    const router = useRouter();

    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const canRenew =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const [activeFilter, setActiveFilter] =
        useState<"All" | ComplianceStatus>("All");

    const [currentPage, setCurrentPage] = useState(1);

    const listQuery = useQuery({
        queryKey: [
            "asset-register",
            "compliance",
            organizationId,
            activeFilter,
            currentPage,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }

            return fetchAssetRegisterComplianceListApi({
                token,
                organizationId,
                page: currentPage,
                pageSize: PAGE_SIZE,

            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const paginatedComplianceItems = useMemo(
        (): ComplianceItem[] =>
            (listQuery.data?.items ?? []).map((row) => ({
                id: row.vehicleId,
                fleetCode: row.fleetCode,
                assetClass: row.assetClassName,
                insuranceExpiry: formatAssetRegisterIsoDate(
                    row.insuranceEndDate,
                ),
                registrationExpiry: formatAssetRegisterIsoDate(
                    row.registrationEndDate,
                ),
                warrantyExpiry: formatAssetRegisterIsoDate(
                    row.warrantyEndDate,
                ),
                status: mapComplianceStatusToUi(
                    row.complianceStatus,
                ),
            })),
        [listQuery.data?.items],
    );

    const totalItems = listQuery.data?.total ?? 0;
    const totalPages = Math.max(
        1,
        listQuery.data?.totalPages ?? 1,
    );

    const isInitialLoading =
        isAuthLoading || (listQuery.isLoading && !listQuery.data);

    // Empty state for an organization with no compliance records.
    const isEmptyOrgList =
        !isInitialLoading &&
        !listQuery.isError &&
        totalItems === 0 &&
        activeFilter === "All";

    const handleFilterChange = (
        filter: "All" | ComplianceStatus,
    ) => {
        setActiveFilter(filter);
        setCurrentPage(1);
    };

    const handleRenew = (item: ComplianceItem) => {
        router.push(
            assetRegisterComplianceRenewalDetailHref(item.id),
        );
    };

    const handleClearFilters = () => {
        setActiveFilter("All");
        setCurrentPage(1);
    };

    const complianceColumns = [
        { key: "fleetCode", label: "FLEET CODE" },
        { key: "assetClass", label: "ASSET CLASS" },
        { key: "insuranceExpiry", label: "INSURANCE EXP." },
        { key: "registrationExpiry", label: "REGISTRATION EXP." },
        { key: "warrantyExpiry", label: "WARRANTY EXP." },
        {
            key: "status",
            label: "STATUS",
            render: (item: ComplianceItem) => (
                <span
                    className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        getStatusClasses(item.status),
                    ].join(" ")}
                >
                    {item.status}
                </span>
            ),
        },
    ];

    return (
        <DashboardLayout
            title="Compliance & Renewals"
            description="Insurance and registration validity across the fleet, soonest expiry first. An expired credential blocks the vehicle from Asset Assignment."
            pagination={
                !isEmptyOrgList && totalItems > 0
                    ? {
                        currentPage,
                        totalPages,
                        totalItems,
                        pageSize: PAGE_SIZE,
                        onPageChange: setCurrentPage,
                    }
                    : undefined
            }
        >
            {/* Status Filters */}
            <div className="mb-4 flex flex-wrap items-center justify-end gap-1.5">
                {STATUS_FILTERS.map((filter) => {
                    const isActive = activeFilter === filter;

                    return (
                        <button
                            key={filter}
                            type="button"
                            onClick={() => handleFilterChange(filter)}
                            className={[
                                "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                                isActive
                                    ? "border-gray-900 bg-gray-900 text-white"
                                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                            ].join(" ")}
                        >
                            {filter}
                        </button>
                    );
                })}
            </div>

            {/* API Error */}
            {listQuery.isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    Could not load compliance records.{" "}
                    <button
                        type="button"
                        className="font-medium underline"
                        onClick={() => void listQuery.refetch()}
                    >
                        Retry
                    </button>
                </div>
            ) : isInitialLoading ? (
                /* Loading State */
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                    Loading compliance records…
                </div>
            ) : isEmptyOrgList ? (
                /* Organization Empty State */
                <DashboardEmptyState
                    icon={
                        <PackageSearch
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No compliance records available"
                    description="Add vehicles to your Fleet Register to start tracking insurance, registration, and warranty expiry dates."
                />
            ) : paginatedComplianceItems.length === 0 ? (
                /* No Results for Selected Filter */
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-5 text-center">
                    <PackageSearch
                        className="mb-3 h-7 w-7 text-gray-400"
                        strokeWidth={1.4}
                    />

                    <h3 className="text-sm font-semibold text-gray-900">
                        No compliance records found
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                        No records match the selected status.
                    </p>

                    {activeFilter !== "All" && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                /* Compliance Table */
                <DashboardTable
                    columns={complianceColumns}
                    data={paginatedComplianceItems}
                    getRowKey={(item) => item.id}
                    renderActions={(item) => (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!canRenew}
                            onClick={() => handleRenew(item)}
                            className="h-9 rounded-md border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Renew
                        </Button>
                    )}
                />
            )}
        </DashboardLayout>
    );
}