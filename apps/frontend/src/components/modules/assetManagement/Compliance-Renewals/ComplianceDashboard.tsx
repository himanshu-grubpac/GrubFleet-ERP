"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ComplianceStatus =
    | "Expired"
    | "Expiring Soon"
    | "Valid";

type ComplianceItem = {
    id: string;
    fleetCode: string;
    assetClass: string;
    insuranceExpiry: string;
    registrationExpiry: string;
    warrantyExpiry: string;
    status: ComplianceStatus;
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_COMPLIANCE_ITEMS: ComplianceItem[] = [
    {
        id: "compliance-001",
        fleetCode: "VH-1006",
        assetClass: "Petrol Scooter — Standard",
        insuranceExpiry: "12-Aug-2026",
        registrationExpiry: "01-May-2031",
        warrantyExpiry: "15-Dec-2026",
        status: "Expired",
    },
    {
        id: "compliance-002",
        fleetCode: "VH-1007",
        assetClass: "Petrol Scooter — Standard",
        insuranceExpiry: "05-Jan-2027",
        registrationExpiry: "01-Sep-2026",
        warrantyExpiry: "10-Nov-2026",
        status: "Expired",
    },
    {
        id: "compliance-003",
        fleetCode: "VH-2004",
        assetClass: "Petrol Auto — Cargo",
        insuranceExpiry: "08-Oct-2026",
        registrationExpiry: "20-Jul-2034",
        warrantyExpiry: "20-Dec-2027",
        status: "Expiring Soon",
    },
    {
        id: "compliance-004",
        fleetCode: "VH-1002",
        assetClass: "Petrol Scooter — Standard",
        insuranceExpiry: "15-Oct-2026",
        registrationExpiry: "02-Jun-2033",
        warrantyExpiry: "18-Nov-2026",
        status: "Expiring Soon",
    },
    {
        id: "compliance-005",
        fleetCode: "VH-1004",
        assetClass: "Petrol Scooter — Standard",
        insuranceExpiry: "11-Jan-2027",
        registrationExpiry: "20-Oct-2026",
        warrantyExpiry: "25-Oct-2026",
        status: "Expiring Soon",
    },
    {
        id: "compliance-006",
        fleetCode: "VH-1005",
        assetClass: "Petrol Scooter — Standard",
        insuranceExpiry: "19-Jan-2027",
        registrationExpiry: "19-Jan-2036",
        warrantyExpiry: "19-Jan-2028",
        status: "Valid",
    },
    {
        id: "compliance-007",
        fleetCode: "VH-1001",
        assetClass: "Petrol Scooter — Standard",
        insuranceExpiry: "14-Mar-2027",
        registrationExpiry: "14-Mar-2038",
        warrantyExpiry: "14-Mar-2028",
        status: "Valid",
    },
    {
        id: "compliance-008",
        fleetCode: "VH-1008",
        assetClass: "Petrol Scooter — Standard",
        insuranceExpiry: "10-Apr-2027",
        registrationExpiry: "05-Feb-2035",
        warrantyExpiry: "05-Feb-2028",
        status: "Valid",
    },
    {
        id: "compliance-009",
        fleetCode: "VH-2001",
        assetClass: "Petrol Auto — Cargo",
        insuranceExpiry: "25-May-2027",
        registrationExpiry: "12-Sep-2034",
        warrantyExpiry: "12-Sep-2028",
        status: "Valid",
    },
    {
        id: "compliance-010",
        fleetCode: "VH-1003",
        assetClass: "Petrol Scooter — Standard",
        insuranceExpiry: "02-Jun-2027",
        registrationExpiry: "02-Jun-2037",
        warrantyExpiry: "02-Jun-2028",
        status: "Valid",
    },
    {
        id: "compliance-011",
        fleetCode: "VH-1010",
        assetClass: "Petrol Scooter — Standard",
        insuranceExpiry: "20-Aug-2027",
        registrationExpiry: "20-Aug-2036",
        warrantyExpiry: "20-Aug-2028",
        status: "Valid",
    },
];

/* -------------------------------------------------------------------------- */
/* Status Filters                                                             */
/* -------------------------------------------------------------------------- */

const STATUS_FILTERS: Array<
    "All" | ComplianceStatus
> = [
        "All",
        "Expired",
        "Expiring Soon",
        "Valid",
    ];

/* -------------------------------------------------------------------------- */
/* Status Badge Helper                                                        */
/* -------------------------------------------------------------------------- */

const getStatusClasses = (
    status: ComplianceStatus,
) => {
    switch (status) {
        case "Expired":
            return "bg-red-50 text-red-600";

        case "Expiring Soon":
            return "bg-orange-50 text-orange-600";

        case "Valid":
            return "bg-green-50 text-green-600";

        default:
            return "bg-gray-50 text-gray-600";
    }
};

/* -------------------------------------------------------------------------- */
/* Fleet Code Hover Information                                               */
/* -------------------------------------------------------------------------- */

function FleetCodeHoverCard({
    item,
}: {
    item: ComplianceItem;
}) {
    return (
        <div className="group relative inline-flex">
            {/* Fleet Code */}

            <span
                className="
                    cursor-default
                    text-xs
                    font-medium
                    text-gray-700
                    transition-colors
                    duration-150
                    group-hover:text-[#FE5720]
                "
            >
                {item.fleetCode}
            </span>

            {/* Hover Card */}

            <div
                className="
                    pointer-events-none
                    invisible
                    absolute
                    left-0
                    top-full
                    z-50
                    mt-2
                    w-[285px]
                    translate-y-1
                    rounded-lg
                    border
                    border-gray-200
                    bg-white
                    p-3
                    opacity-0
                    shadow-lg
                    transition-all
                    duration-150
                    group-hover:visible
                    group-hover:translate-y-0
                    group-hover:opacity-100
                "
            >
                {/* Header */}

                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                            Fleet code
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-gray-900">
                            {item.fleetCode}
                        </p>
                    </div>

                    <span
                        className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium",
                            getStatusClasses(
                                item.status,
                            ),
                        ].join(" ")}
                    >
                        {item.status}
                    </span>
                </div>

                {/* Vehicle Information */}

                <div className="border-t border-gray-100 pt-2.5">
                    <p className="mb-2 text-[10px] font-semibold text-gray-800">
                        Vehicle information
                    </p>

                    <div className="space-y-2">
                        {/* Asset Class */}

                        <div className="flex items-start justify-between gap-4">
                            <span className="shrink-0 text-[9px] text-gray-500">
                                Asset class
                            </span>

                            <span className="max-w-[175px] text-right text-[10px] font-medium text-gray-800">
                                {item.assetClass}
                            </span>
                        </div>

                        {/* Insurance */}

                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[9px] text-gray-500">
                                Insurance expiry
                            </span>

                            <span className="text-[10px] font-medium text-gray-800">
                                {item.insuranceExpiry}
                            </span>
                        </div>

                        {/* Registration */}

                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[9px] text-gray-500">
                                Registration expiry
                            </span>

                            <span className="text-[10px] font-medium text-gray-800">
                                {item.registrationExpiry}
                            </span>
                        </div>

                        {/* Warranty */}

                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[9px] text-gray-500">
                                Warranty expiry
                            </span>

                            <span className="text-[10px] font-medium text-gray-800">
                                {item.warrantyExpiry}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ComplianceDashboardPage() {
    const router = useRouter();

    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [activeFilter, setActiveFilter] = useState<
        "All" | ComplianceStatus
    >("All");

    const [currentPage, setCurrentPage] =
        useState(1);

    /* ---------------------------------------------------------------------- */
    /* Pagination Settings                                                    */
    /* ---------------------------------------------------------------------- */

    const pageSize = 11;

    /* ---------------------------------------------------------------------- */
    /* Filtering                                                              */
    /* ---------------------------------------------------------------------- */

    const filteredComplianceItems = useMemo(() => {
        if (activeFilter === "All") {
            return MOCK_COMPLIANCE_ITEMS;
        }

        return MOCK_COMPLIANCE_ITEMS.filter(
            (item) =>
                item.status === activeFilter,
        );
    }, [activeFilter]);

    /* ---------------------------------------------------------------------- */
    /* Pagination                                                             */
    /* ---------------------------------------------------------------------- */

    const totalItems =
        filteredComplianceItems.length;

    const totalPages = Math.max(
        1,
        Math.ceil(totalItems / pageSize),
    );

    const safeCurrentPage = Math.min(
        currentPage,
        totalPages,
    );

    const paginatedComplianceItems =
        useMemo(() => {
            const startIndex =
                (safeCurrentPage - 1) *
                pageSize;

            const endIndex =
                startIndex + pageSize;

            return filteredComplianceItems.slice(
                startIndex,
                endIndex,
            );
        }, [
            filteredComplianceItems,
            safeCurrentPage,
        ]);

    /* ---------------------------------------------------------------------- */
    /* Filter Handler                                                         */
    /* ---------------------------------------------------------------------- */

    const handleFilterChange = (
        filter: "All" | ComplianceStatus,
    ) => {
        setActiveFilter(filter);
        setCurrentPage(1);
    };

    /* ---------------------------------------------------------------------- */
    /* Renew Handler                                                          */
    /* ---------------------------------------------------------------------- */

    const handleRenew = (
        item: ComplianceItem,
    ) => {
        router.push(
            `/asset-register/compliance-renewals/${item.id}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                          */
    /* ---------------------------------------------------------------------- */

    const complianceColumns = [
        {
            key: "fleetCode",
            label: "FLEET CODE",

            render: (
                item: ComplianceItem,
            ) => (
                <FleetCodeHoverCard
                    item={item}
                />
            ),
        },

        {
            key: "assetClass",
            label: "ASSET CLASS",
        },

        {
            key: "insuranceExpiry",
            label: "INSURANCE EXP.",
        },

        {
            key: "registrationExpiry",
            label: "REGISTRATION EXP.",
        },

        {
            key: "warrantyExpiry",
            label: "WARRANTY EXP.",
        },

        {
            key: "status",
            label: "STATUS",

            render: (
                item: ComplianceItem,
            ) => (
                <span
                    className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        getStatusClasses(
                            item.status,
                        ),
                    ].join(" ")}
                >
                    {item.status}
                </span>
            ),
        },
    ];

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <DashboardLayout
            title="Compliance & Renewals"
            description="Insurance and registration validity across the fleet, soonest expiry first. An expired credential blocks the vehicle from Asset Assignment."
            pagination={{
                currentPage,
                totalPages,
                totalItems,
                pageSize,
                onPageChange: setCurrentPage,
            }}
        >
            {/* ================================================================== */}
            {/* Status Filters                                                      */}
            {/* ================================================================== */}

            <div className="mb-3 flex items-center justify-end gap-1.5">
                {STATUS_FILTERS.map((filter) => {
                    const isActive =
                        activeFilter === filter;

                    return (
                        <button
                            key={filter}
                            type="button"
                            onClick={() =>
                                handleFilterChange(
                                    filter,
                                )
                            }
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

            {/* ================================================================== */}
            {/* Compliance Table                                                    */}
            {/* ================================================================== */}

            <DashboardTable
                columns={complianceColumns}
                data={paginatedComplianceItems}
                getRowKey={(item) => item.id}
                renderActions={(item) => (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            handleRenew(item)
                        }
                        className="
                            h-9
                            rounded-md
                            border-gray-300
                            bg-white
                            px-5
                            text-sm
                            font-medium
                            text-gray-700
                            hover:bg-gray-50
                        "
                    >
                        Renew
                    </Button>
                )}
            />
        </DashboardLayout>
    );
}