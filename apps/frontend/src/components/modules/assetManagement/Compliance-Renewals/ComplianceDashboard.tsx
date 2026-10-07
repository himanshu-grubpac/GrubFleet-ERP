"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { fetchAssetRegisterComplianceListApi } from "@/lib/api/asset-register/compliance";
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
    const { token, organizationId, isLoading: isAuthLoading, permissions } =
        useAuth();

    const canRenew =
        permissions.has("asset_register.update") ||
        permissions.has("asset_register.manage");

    const [activeFilter, setActiveFilter] = useState<
        "All" | ComplianceStatus
    >("All");
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
                status: mapComplianceFilterToApi(activeFilter),
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const paginatedComplianceItems = useMemo((): ComplianceItem[] => {
        return (listQuery.data?.items ?? []).map((row) => ({
            id: row.vehicleId,
            fleetCode: row.fleetCode,
            assetClass: row.assetClassName,
            insuranceExpiry: formatAssetRegisterIsoDate(row.insuranceEndDate),
            registrationExpiry: formatAssetRegisterIsoDate(
                row.registrationEndDate,
            ),
            warrantyExpiry: formatAssetRegisterIsoDate(row.warrantyEndDate),
            status: mapComplianceStatusToUi(row.complianceStatus),
        }));
    }, [listQuery.data?.items]);

    const totalItems = listQuery.data?.total ?? 0;
    const totalPages = Math.max(1, listQuery.data?.totalPages ?? 1);

    const handleFilterChange = (filter: "All" | ComplianceStatus) => {
        setActiveFilter(filter);
        setCurrentPage(1);
    };

    const handleRenew = (item: ComplianceItem) => {
        router.push(`/asset-register/compliance-renewals/${item.id}`);
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

    const isInitialLoading =
        isAuthLoading || (listQuery.isLoading && !listQuery.data);

    return (
        <DashboardLayout
            title="Compliance & Renewals"
            description="Insurance and registration validity across the fleet, soonest expiry first. An expired credential blocks the vehicle from Asset Assignment."
            pagination={{
                currentPage,
                totalPages,
                totalItems,
                pageSize: PAGE_SIZE,
                onPageChange: setCurrentPage,
            }}
        >
            <div className="mb-3 flex items-center justify-end gap-1.5">
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
                        className="underline"
                        onClick={() => void listQuery.refetch()}
                    >
                        Retry
                    </button>
                </div>
            ) : isInitialLoading ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                    Loading compliance records…
                </div>
            ) : (
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
