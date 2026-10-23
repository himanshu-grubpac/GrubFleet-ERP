"use client";

import { useEffect, useMemo, useState } from "react";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import DashboardAssetClassTableCell from "@/components/dashboard/DashboardAssetClassTableCell";

import Button from "@/components/ui/GrubpacButton";
import { DashboardStatusPill } from "@/components/dashboard/dashboard-semantic-cell";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { ASSET_REGISTER_COMPLIANCE_COLUMN_SORT } from "@/lib/query/dashboard-list-column-sort-maps";
import {
    listSortQueryKeyPart,
    useDashboardTableListSort,
} from "@/lib/query/dashboard-table-list-sort";
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
    insuranceStart: string;
    insuranceExpiry: string;
    registrationStart: string;
    registrationExpiry: string;
    warrantyStart: string;
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

const COMPLIANCE_STATUS_LEVEL = {
    Valid: "success",
    "Expiring Soon": "warning",
    Expired: "danger",
} as const satisfies Record<
    ComplianceStatus,
    "success" | "warning" | "danger"
>;

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
    const [copiedAssetClass, setCopiedAssetClass] = useState<string | null>(
        null,
    );
    const {
        sort: tableSort,
        onSortChange,
        listSortParams,
        serverSorted,
    } = useDashboardTableListSort(ASSET_REGISTER_COMPLIANCE_COLUMN_SORT);

    useEffect(() => {
        setCurrentPage(1);
    }, [listSortParams?.sortBy, listSortParams?.sortOrder]);

    const listQuery = useQuery({
        queryKey: [
            "asset-register",
            "compliance",
            organizationId,
            activeFilter,
            currentPage,
            ...listSortQueryKeyPart(listSortParams),
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }

            const complianceStatus = mapComplianceFilterToApi(activeFilter);

            return fetchAssetRegisterComplianceListApi({
                token,
                organizationId,
                page: currentPage,
                pageSize: PAGE_SIZE,
                complianceStatus,
                ...listSortParams,
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

                insuranceStart: formatAssetRegisterIsoDate(
                    row.insurance?.startDate,
                ),
                insuranceExpiry: formatAssetRegisterIsoDate(
                    row.insurance?.endDate,
                ),

                registrationStart: formatAssetRegisterIsoDate(
                    row.registration?.startDate,
                ),
                registrationExpiry: formatAssetRegisterIsoDate(
                    row.registration?.endDate,
                ),

                warrantyStart: formatAssetRegisterIsoDate(
                    row.warranty?.startDate,
                ),
                warrantyExpiry: formatAssetRegisterIsoDate(
                    row.warranty?.endDate,
                ),

                status: mapComplianceStatusToUi(
                    row.overallComplianceStatus,
                ),
            })),
        [listQuery.data?.items],
    );

    const totalItems = listQuery.data?.total ?? 0;
    const totalPages = Math.max(1, listQuery.data?.totalPages ?? 1);

    const isInitialLoading =
        isAuthLoading || (listQuery.isLoading && !listQuery.data);

    const isEmptyOrgList =
        !isInitialLoading &&
        !listQuery.isError &&
        totalItems === 0 &&
        activeFilter === "All";

    const handleFilterChange = (filter: "All" | ComplianceStatus) => {
        setActiveFilter(filter);
        setCurrentPage(1);
    };

    const handleRenew = (item: ComplianceItem) => {
        navigateToEntityShell(router, assetRegisterComplianceRenewalDetailHref(item.id), item.id, 'push');
    };

    const handleClearFilters = () => {
        setActiveFilter("All");
        setCurrentPage(1);
    };

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

    const complianceColumns = [
        {
            key: "fleetCode",
            label: "FLEET CODE",
            className: "w-[100px] whitespace-nowrap",
        },
        {
            key: "assetClass",
            label: "ASSET CLASS",
            sortable: false,
            className: "w-[180px] max-w-[180px]",
            render: (item: ComplianceItem) => (
                <DashboardAssetClassTableCell
                    assetClass={item.assetClass}
                    copied={copiedAssetClass === item.assetClass}
                    onCopy={() => void handleCopyAssetClass(item.assetClass)}
                />
            ),
        },
        { key: "insuranceStart", label: "INSURANCE START", sortable: false },
        { key: "insuranceExpiry", label: "INSURANCE EXP.", sortable: false },
        { key: "registrationStart", label: "REGISTRATION START", sortable: false },
        { key: "registrationExpiry", label: "REGISTRATION EXP.", sortable: false },
        { key: "warrantyStart", label: "WARRANTY START", sortable: false },
        { key: "warrantyExpiry", label: "WARRANTY EXP.", sortable: false },
        {
            key: "status",
            label: "STATUS",
            sortable: false,
            render: (item: ComplianceItem) => (
                <DashboardStatusPill
                    level={COMPLIANCE_STATUS_LEVEL[item.status]}
                    label={item.status}
                />
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
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                    Loading compliance records…
                </div>
            ) : isEmptyOrgList ? (
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
                <DashboardTable
                    columns={complianceColumns}
                    data={paginatedComplianceItems}
                    getRowKey={(item) => item.id}
                    sortState={tableSort}
                    onSortChange={onSortChange}
                    serverSorted={serverSorted}
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
