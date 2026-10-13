"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Search } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type WorkOrderStatus =
    | "not-started"
    | "in-progress"
    | "completed"
    | "cancelled";

type WorkOrder = {
    id: string;
    workOrderNumber: string;
    vehicleCode: string;
    vehicleName: string;
    type: string;
    source: string;
    technician: string;
    status: WorkOrderStatus;
};

/* -------------------------------------------------------------------------- */
/* Filter Types                                                               */
/* -------------------------------------------------------------------------- */

type WorkOrderFilter =
    | "all"
    | "not-started"
    | "in-progress"
    | "completed"
    | "cancelled";

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_WORK_ORDERS: WorkOrder[] = [
    {
        id: "1",
        workOrderNumber: "WO-2026-1187",
        vehicleCode: "VH-1004",
        vehicleName: "Petrol Scooter",
        type: "General",
        source: "Manual",
        technician: "Vikram Joshi",
        status: "in-progress",
    },
    {
        id: "2",
        workOrderNumber: "WO-2026-1201",
        vehicleCode: "VH-1004",
        vehicleName: "Petrol Scooter",
        type: "PM",
        source: "Maintenance Schedule",
        technician: "Vikram Joshi",
        status: "not-started",
    },
    {
        id: "3",
        workOrderNumber: "WO-2026-1198",
        vehicleCode: "VH-1007",
        vehicleName: "Delivery Van",
        type: "General",
        source: "Manual",
        technician: "Rahul Sharma",
        status: "completed",
    },
    {
        id: "4",
        workOrderNumber: "WO-2026-1179",
        vehicleCode: "VH-1002",
        vehicleName: "Cargo Auto",
        type: "General",
        source: "Manual",
        technician: "Amit Kumar",
        status: "in-progress",
    },
    {
        id: "5",
        workOrderNumber: "WO-2026-1168",
        vehicleCode: "VH-1009",
        vehicleName: "Service Van",
        type: "PM",
        source: "Maintenance Schedule",
        technician: "Suresh Verma",
        status: "completed",
    },
];

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

const WORK_ORDER_FILTERS: {
    label: string;
    value: WorkOrderFilter;
}[] = [
        {
            label: "All",
            value: "all",
        },
        {
            label: "Not Started",
            value: "not-started",
        },
        {
            label: "In Progress",
            value: "in-progress",
        },
        {
            label: "Completed",
            value: "completed",
        },
        {
            label: "Cancelled",
            value: "cancelled",
        },
    ];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getStatusLabel = (status: WorkOrderStatus) => {
    switch (status) {
        case "not-started":
            return "Not Started";

        case "in-progress":
            return "In Progress";

        case "completed":
            return "Completed";

        case "cancelled":
            return "Cancelled";

        default:
            return status;
    }
};

const getStatusClass = (status: WorkOrderStatus) => {
    switch (status) {
        case "not-started":
            return "bg-gray-100 text-gray-600";

        case "in-progress":
            return "bg-orange-50 text-orange-700";

        case "completed":
            return "bg-green-50 text-green-700";

        case "cancelled":
            return "bg-red-50 text-red-600";

        default:
            return "bg-gray-100 text-gray-600";
    }
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function WorkshopDashboardPage() {
    const router = useRouter();

    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] =
        useState<WorkOrderFilter>("all");

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                             */
    /* ---------------------------------------------------------------------- */

    const handleCreateWorkOrder = () => {
        router.push("/workshop/work-order/create");
    };

    const handleView = (workOrder: WorkOrder) => {
        router.push(
            `/workshop/work-orders/${workOrder.workOrderNumber}`
        );
    };

    const handleEdit = (workOrder: WorkOrder) => {
        router.push(`/workshop/work-order/${workOrder.id}/edit`);
    };

    /* ---------------------------------------------------------------------- */
    /* Filtering                                                              */
    /* ---------------------------------------------------------------------- */

    const filteredWorkOrders = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return MOCK_WORK_ORDERS.filter((workOrder) => {
            const matchesSearch =
                !searchValue ||
                workOrder.workOrderNumber
                    .toLowerCase()
                    .includes(searchValue) ||
                workOrder.vehicleCode
                    .toLowerCase()
                    .includes(searchValue) ||
                workOrder.vehicleName
                    .toLowerCase()
                    .includes(searchValue) ||
                workOrder.technician
                    .toLowerCase()
                    .includes(searchValue);

            let matchesFilter = true;

            switch (activeFilter) {
                case "not-started":
                    matchesFilter =
                        workOrder.status === "not-started";
                    break;

                case "in-progress":
                    matchesFilter =
                        workOrder.status === "in-progress";
                    break;

                case "completed":
                    matchesFilter =
                        workOrder.status === "completed";
                    break;

                case "cancelled":
                    matchesFilter =
                        workOrder.status === "cancelled";
                    break;

                case "all":
                default:
                    matchesFilter = true;
                    break;
            }

            return matchesSearch && matchesFilter;
        });
    }, [search, activeFilter]);

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

    const workOrderColumns = [
        {
            key: "workOrderNumber",
            label: "WORK ORDER",
            render: (workOrder: WorkOrder) => (
                <button
                    type="button"
                    onClick={() => handleView(workOrder)}
                    className="font-medium text-gray-900 hover:text-[#FE5720]"
                >
                    {workOrder.workOrderNumber}
                </button>
            ),
        },

        {
            key: "vehicle",
            label: "VEHICLE",
            render: (workOrder: WorkOrder) => (
                <div>
                    <p className="text-gray-700">
                        {workOrder.vehicleCode}
                    </p>

                    <p className="text-[10px] text-gray-400">
                        {workOrder.vehicleName}
                    </p>
                </div>
            ),
        },

        {
            key: "type",
            label: "TYPE",
        },

        {
            key: "source",
            label: "SOURCE",
        },

        {
            key: "technician",
            label: "TECHNICIAN",
        },

        {
            key: "status",
            label: "STATUS",
            render: (workOrder: WorkOrder) => (
                <span
                    className={[
                        "inline-flex rounded-full px-2.5 py-1",
                        "text-xs font-medium",
                        getStatusClass(workOrder.status),
                    ].join(" ")}
                >
                    {getStatusLabel(workOrder.status)}
                </span>
            ),
        },
    ];

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <DashboardLayout
            title="Work Orders"
            description="Manage workshop work orders, repairs, maintenance and parts usage."
            activeTab="/workshop/work-orders"
            action={
                <Button
                    type="button"
                    onClick={handleCreateWorkOrder}
                >
                    + Create Work Order
                </Button>
            }
        >
            {/* ============================================================= */}
            {/* Filters                                                        */}
            {/* ============================================================= */}

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
                        placeholder="Search by work order, vehicle or technician"
                        className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                    />
                </div>

                {/* Status Filters */}

                <div className="flex shrink-0 items-center gap-1.5">
                    {WORK_ORDER_FILTERS.map((filter) => {
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

            {/* ============================================================= */}
            {/* Empty / Table                                                  */}
            {/* ============================================================= */}

            {MOCK_WORK_ORDERS.length === 0 ? (
                <DashboardEmptyState
                    icon={
                        <ClipboardList
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No work orders yet"
                    description="Create your first work order to start managing workshop work."
                    buttonLabel="Create Work Order"
                    onButtonClick={handleCreateWorkOrder}
                />
            ) : filteredWorkOrders.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
                    <ClipboardList
                        className="mb-3 h-7 w-7 text-gray-400"
                        strokeWidth={1.4}
                    />

                    <h3 className="text-sm font-semibold text-gray-900">
                        No work orders found
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
                    columns={workOrderColumns}
                    data={filteredWorkOrders}
                    getRowKey={(workOrder) => workOrder.id}
                    renderActions={(workOrder) => (
                        <DashboardTableActions
                            status={
                                workOrder.status === "completed" ||
                                    workOrder.status === "cancelled"
                                    ? "inactive"
                                    : "active"
                            }
                            locationId={workOrder.id}
                            viewHref={`/workshop/work-order/${workOrder.workOrderNumber}`}
                            onEdit={() => handleEdit(workOrder)}
                            onToggleStatus={() => {
                                console.log(
                                    "Toggle work order status:",
                                    workOrder.id,
                                );
                            }}
                        />
                    )}
                />
            )}
        </DashboardLayout>
    );
}