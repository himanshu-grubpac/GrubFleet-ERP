"use client";

import { useEffect, useMemo, useState } from "react";

import { Info, PackageSearch } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type PartsRequestStatus = "Blocked" | "Fulfilled";

type PartsRequest = {
    id: string;
    date: string;
    workOrder: string;
    part: string;
    quantity: number;
    unit: string;
    location: string;
    requestType: "Internal" | "External";
    vehicle: string;
    status: PartsRequestStatus;
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_PARTS_REQUESTS: PartsRequest[] = [
    {
        id: "request-001",
        date: "25-Sep-2026",
        workOrder: "WO-2026-1163",
        part: "Cargo Box Hinge Kit",
        quantity: 2,
        unit: "kits",
        location: "Malad Workshop",
        requestType: "Internal",
        vehicle: "VH-1013",
        status: "Blocked",
    },
    {
        id: "request-002",
        date: "24-Sep-2026",
        workOrder: "WO-2026-1160",
        part: "Battery (12V Lead-Acid)",
        quantity: 12,
        unit: "each",
        location: "Bhiwandi Warehouse",
        requestType: "Internal",
        vehicle: "VH-1012",
        status: "Blocked",
    },
    {
        id: "request-003",
        date: "22-Sep-2026",
        workOrder: "WO-2026-1150",
        part: "Tyre — 3.00-10",
        quantity: 2,
        unit: "each",
        location: "Malad Workshop",
        requestType: "Internal",
        vehicle: "VH-1004",
        status: "Fulfilled",
    },
    {
        id: "request-004",
        date: "20-Sep-2026",
        workOrder: "WO-2026-1142",
        part: "Brake Pad Set (Front+Rear)",
        quantity: 1,
        unit: "set",
        location: "Bhandup Workshop",
        requestType: "Internal",
        vehicle: "VH-1006",
        status: "Fulfilled",
    },
    {
        id: "request-005",
        date: "15-Sep-2026",
        workOrder: "WO-2026-1135",
        part: "Engine Oil (1L)",
        quantity: 4,
        unit: "litres",
        location: "Bhandup Workshop",
        requestType: "Internal",
        vehicle: "VH-1009",
        status: "Fulfilled",
    },
    {
        id: "request-006",
        date: "10-Sep-2026",
        workOrder: "WO-2026-1120",
        part: "Chain Sprocket Kit",
        quantity: 1,
        unit: "kit",
        location: "Bhandup Workshop",
        requestType: "Internal",
        vehicle: "VH-1001",
        status: "Fulfilled",
    },
    {
        id: "request-007",
        date: "06-Sep-2026",
        workOrder: "WO-2026-1108",
        part: "Spark Plug",
        quantity: 4,
        unit: "each",
        location: "Thane Workshop",
        requestType: "External",
        vehicle: "VH-1011",
        status: "Fulfilled",
    },
    {
        id: "request-008",
        date: "02-Sep-2026",
        workOrder: "WO-2026-1098",
        part: "Brake Pad Set (Front+Rear)",
        quantity: 1,
        unit: "set",
        location: "Bhandup Workshop",
        requestType: "External",
        vehicle: "VH-2004",
        status: "Fulfilled",
    },
    {
        id: "request-009",
        date: "29-Aug-2026",
        workOrder: "WO-2026-1090",
        part: "Headlamp Assembly",
        quantity: 1,
        unit: "each",
        location: "Bhandup Workshop",
        requestType: "External",
        vehicle: "VH-1014",
        status: "Fulfilled",
    },
    {
        id: "request-010",
        date: "18-Aug-2026",
        workOrder: "WO-2026-1054",
        part: "Brake Pad Set (Front+Rear)",
        quantity: 2,
        unit: "sets",
        location: "Bhandup Workshop",
        requestType: "Internal",
        vehicle: "VH-1007",
        status: "Fulfilled",
    },
    {
        id: "request-011",
        date: "15-Aug-2026",
        workOrder: "WO-2026-1048",
        part: "Air Filter",
        quantity: 3,
        unit: "each",
        location: "Malad Workshop",
        requestType: "Internal",
        vehicle: "VH-1015",
        status: "Fulfilled",
    },
    {
        id: "request-012",
        date: "12-Aug-2026",
        workOrder: "WO-2026-1039",
        part: "Clutch Cable",
        quantity: 2,
        unit: "each",
        location: "Thane Workshop",
        requestType: "External",
        vehicle: "VH-1008",
        status: "Fulfilled",
    },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function PartsRequestsDashboardPage() {
    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [partsRequests, setPartsRequests] =
        useState<PartsRequest[]>(MOCK_PARTS_REQUESTS);

    const [search, setSearch] = useState("");

    const [filters, setFilters] = useState<Record<string, string>>({
        status: "",
        location: "",
        requestType: "",
    });

    const [currentPage, setCurrentPage] = useState(1);

    /* ---------------------------------------------------------------------- */
    /* Filter Options                                                          */
    /* ---------------------------------------------------------------------- */

    const locationOptions = useMemo(() => {
        const locations = Array.from(
            new Set(
                partsRequests.map(
                    (request) => request.location,
                ),
            ),
        );

        return locations.map((location) => ({
            label: location,
            value: location,
        }));
    }, [partsRequests]);

    /* ---------------------------------------------------------------------- */
    /* Filter Data                                                             */
    /* ---------------------------------------------------------------------- */

    const filteredPartsRequests = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return partsRequests.filter((request) => {
            const matchesSearch =
                !searchValue ||
                request.workOrder
                    .toLowerCase()
                    .includes(searchValue) ||
                request.part
                    .toLowerCase()
                    .includes(searchValue) ||
                request.vehicle
                    .toLowerCase()
                    .includes(searchValue);

            const matchesStatus =
                !filters.status ||
                request.status === filters.status;

            const matchesLocation =
                !filters.location ||
                request.location === filters.location;

            const matchesRequestType =
                !filters.requestType ||
                request.requestType ===
                filters.requestType;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesLocation &&
                matchesRequestType
            );
        });
    }, [partsRequests, search, filters]);

    /* ---------------------------------------------------------------------- */
    /* Reset Pagination When Search / Filters Change                          */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filters]);

    /* ---------------------------------------------------------------------- */
    /* Pagination                                                              */
    /* ---------------------------------------------------------------------- */

    const totalItems = filteredPartsRequests.length;

    const totalPages = Math.max(
        1,
        Math.ceil(totalItems / PAGE_SIZE),
    );

    const paginatedPartsRequests = useMemo(() => {
        const startIndex =
            (currentPage - 1) * PAGE_SIZE;

        const endIndex = startIndex + PAGE_SIZE;

        return filteredPartsRequests.slice(
            startIndex,
            endIndex,
        );
    }, [filteredPartsRequests, currentPage]);

    /* ---------------------------------------------------------------------- */
    /* Clear Filters                                                           */
    /* ---------------------------------------------------------------------- */

    const handleClearFilters = () => {
        setSearch("");

        setFilters({
            status: "",
            location: "",
            requestType: "",
        });

        setCurrentPage(1);
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                           */
    /* ---------------------------------------------------------------------- */

    const requestColumns = [
        {
            key: "date",
            label: "DATE",
            render: (request: PartsRequest) => (
                <span className="text-sm font-medium text-gray-700">
                    {request.date}
                </span>
            ),
        },

        {
            key: "workOrder",
            label: "WORK ORDER",
            render: (request: PartsRequest) => (
                <span className="text-sm font-medium text-gray-700">
                    {request.workOrder}
                </span>
            ),
        },

        {
            key: "part",
            label: "PART",
            render: (request: PartsRequest) => (
                <span className="text-sm font-semibold text-gray-900">
                    {request.part}
                </span>
            ),
        },

        {
            key: "quantity",
            label: "QTY",
            render: (request: PartsRequest) => (
                <span className="text-sm text-gray-700">
                    {request.quantity}{" "}
                    {request.unit}
                </span>
            ),
        },

        {
            key: "location",
            label: "LOCATION",
            render: (request: PartsRequest) => (
                <span className="text-sm text-gray-600">
                    {request.location}
                </span>
            ),
        },

        {
            key: "typeVehicle",
            label: "TYPE / VEHICLE",
            render: (request: PartsRequest) => (
                <span className="text-sm text-gray-600">
                    {request.requestType} —{" "}
                    {request.vehicle}
                </span>
            ),
        },

        {
            key: "status",
            label: "STATUS",
            render: (request: PartsRequest) => {
                const isBlocked =
                    request.status === "Blocked";

                return (
                    <span
                        className={[
                            "inline-flex items-center rounded-full",
                            "px-2.5 py-1 text-xs font-medium",
                            isBlocked
                                ? "bg-red-100 text-red-700"
                                : "bg-green-50 text-green-700",
                        ].join(" ")}
                    >
                        {request.status}
                    </span>
                );
            },
        },
    ];

    /* ---------------------------------------------------------------------- */
    /* Render                                                                  */
    /* ---------------------------------------------------------------------- */

    return (
        <DashboardLayout
            title="Parts Requests"
            description="Every part requested by Workshop against a Work Order, and how it resolved."
            pagination={{
                currentPage,
                totalPages,
                totalItems,
                pageSize: PAGE_SIZE,
                onPageChange: setCurrentPage,
            }}
        >
            {/* ================================================================== */}
            {/* Filters                                                            */}
            {/* ================================================================== */}

            <DashboardFilters
                searchValue={search}
                searchPlaceholder="Search by Work Order, part, or vehicle"
                onSearchChange={setSearch}
                filterValues={filters}
                onFilterChange={(key, value) => {
                    setFilters((previous) => ({
                        ...previous,
                        [key]: value,
                    }));
                }}
                onClear={handleClearFilters}
            />

            {/* ================================================================== */}
            {/* Empty State                                                        */}
            {/* ================================================================== */}

            {filteredPartsRequests.length === 0 ? (
                <DashboardEmptyState
                    icon={
                        <PackageSearch
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No parts requests found"
                    description="Try changing your search or filters."
                    buttonLabel="Clear filters"
                    onButtonClick={
                        handleClearFilters
                    }
                />
            ) : (
                <>
                    {/* ========================================================== */}
                    {/* Parts Requests Table                                       */}
                    {/* ========================================================== */}

                    <DashboardTable
                        columns={requestColumns}
                        data={paginatedPartsRequests}
                        getRowKey={(request) => request.id}
                        renderActions={(request) => (
                            <DashboardTableActions
                                status="active"
                                locationId={request.id}
                                viewHref={`/inventory/parts-requests/${request.id}`}
                                hideEdit
                                onToggleStatus={() => { }}
                            />
                        )}
                    />

                    {/* ========================================================== */}
                    {/* Information Note                                           */}
                    {/* ========================================================== */}

                    <div className="mt-3 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <Info
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500"
                            strokeWidth={1.8}
                        />

                        <p className="text-[11px] leading-4 text-gray-700">
                            Remove is only available on a
                            Blocked request — it never left
                            the shelf, so clearing it is
                            safe. A Fulfilled request has
                            already been drawn from stock
                            (and, per Workshop&apos;s
                            no-wait handling, likely already
                            installed) — there&apos;s no
                            undo; a genuine dispensing error
                            is reconciled at the next stock
                            count.
                        </p>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
}