"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Search } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
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
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_FLEET_VEHICLES: FleetVehicle[] = [
    {
        id: "vehicle-001",
        fleetCode: "VH-1001",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1001",
        odometer: 12480,
        status: "available",

        registrationStartDate: "2024-04-01",
        registrationEndDate: "2039-03-31",

        warrantyStartDate: "2024-04-01",
        warrantyEndDate: "2026-03-31",

        insuranceSupplier: "ICICI Lombard",
        insuranceRenewalDate: "2026-04-15",
    },

    {
        id: "vehicle-002",
        fleetCode: "VH-1002",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1002",
        odometer: 8930,
        status: "available",

        registrationStartDate: "2024-04-02",
        registrationEndDate: "2039-04-01",

        warrantyStartDate: "2024-04-02",
        warrantyEndDate: "2026-04-01",

        insuranceSupplier: "HDFC ERGO",
        insuranceRenewalDate: "2026-05-10",
    },

    {
        id: "vehicle-003",
        fleetCode: "VH-1003",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1003",
        odometer: 21110,
        status: "leased",

        registrationStartDate: "2024-04-03",
        registrationEndDate: "2039-04-02",

        warrantyStartDate: "2024-04-03",
        warrantyEndDate: "2026-04-02",

        insuranceSupplier: "Bajaj Allianz",
        insuranceRenewalDate: "2026-06-18",

        leasedTo: "ABC Logistics Pvt. Ltd.",
        leaseStartDate: "2026-01-01",
        leaseEndDate: "2026-12-31",
    },

    {
        id: "vehicle-004",
        fleetCode: "VH-1004",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1004",
        odometer: 15670,
        status: "leased",

        registrationStartDate: "2024-04-04",
        registrationEndDate: "2039-04-03",

        warrantyStartDate: "2024-04-04",
        warrantyEndDate: "2026-04-03",

        insuranceSupplier: "ICICI Lombard",
        insuranceRenewalDate: "2026-07-12",

        leasedTo: "XYZ Delivery Services",
        leaseStartDate: "2026-02-01",
        leaseEndDate: "2027-01-31",
    },

    {
        id: "vehicle-005",
        fleetCode: "VH-1005",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1005",
        odometer: 3220,
        status: "available",

        registrationStartDate: "2024-04-05",
        registrationEndDate: "2039-04-04",

        warrantyStartDate: "2024-04-05",
        warrantyEndDate: "2026-04-04",

        insuranceSupplier: "HDFC ERGO",
        insuranceRenewalDate: "2026-08-20",
    },

    {
        id: "vehicle-006",
        fleetCode: "VH-1006",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1006",
        odometer: 18900,
        status: "workshop",

        registrationStartDate: "2024-04-06",
        registrationEndDate: "2039-04-05",

        warrantyStartDate: "2024-04-06",
        warrantyEndDate: "2026-04-05",

        insuranceSupplier: "Bajaj Allianz",
        insuranceRenewalDate: "2026-09-14",

        workshopName: "GrubPac Workshop",
        workshopStartDate: "2026-09-28",
    },

    {
        id: "vehicle-007",
        fleetCode: "VH-1007",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1007",
        odometer: 26340,
        status: "leased",

        registrationStartDate: "2024-04-07",
        registrationEndDate: "2039-04-06",

        warrantyStartDate: "2024-04-07",
        warrantyEndDate: "2026-04-06",

        insuranceSupplier: "ICICI Lombard",
        insuranceRenewalDate: "2026-10-05",

        leasedTo: "FastMove Logistics",
        leaseStartDate: "2026-03-01",
        leaseEndDate: "2027-02-28",
    },

    {
        id: "vehicle-008",
        fleetCode: "VH-1008",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1008",
        odometer: 9540,
        status: "leased",

        registrationStartDate: "2024-04-08",
        registrationEndDate: "2039-04-07",

        warrantyStartDate: "2024-04-08",
        warrantyEndDate: "2026-04-07",

        insuranceSupplier: "HDFC ERGO",
        insuranceRenewalDate: "2026-10-20",

        leasedTo: "QuickRide Transport",
        leaseStartDate: "2026-04-01",
        leaseEndDate: "2027-03-31",
    },

    {
        id: "vehicle-009",
        fleetCode: "VH-1009",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1009",
        odometer: 0,
        status: "available",

        registrationStartDate: "2024-04-09",
        registrationEndDate: "2039-04-08",

        warrantyStartDate: "2024-04-09",
        warrantyEndDate: "2026-04-08",

        insuranceSupplier: "ICICI Lombard",
        insuranceRenewalDate: "2026-11-15",
    },

    {
        id: "vehicle-010",
        fleetCode: "VH-1010",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1010",
        odometer: 34200,
        status: "available",

        registrationStartDate: "2024-04-10",
        registrationEndDate: "2039-04-09",

        warrantyStartDate: "2024-04-10",
        warrantyEndDate: "2026-04-09",

        insuranceSupplier: "Bajaj Allianz",
        insuranceRenewalDate: "2026-12-01",
    },

    {
        id: "vehicle-011",
        fleetCode: "VH-2001",
        assetClass: "Petrol Auto — Cargo",
        registrationNumber: "MH04 CD 2001",
        odometer: 34200,
        status: "leased",

        registrationStartDate: "2024-05-01",
        registrationEndDate: "2039-04-30",

        warrantyStartDate: "2024-05-01",
        warrantyEndDate: "2026-04-30",

        insuranceSupplier: "ICICI Lombard",
        insuranceRenewalDate: "2026-12-10",

        leasedTo: "CargoFleet India",
        leaseStartDate: "2026-01-15",
        leaseEndDate: "2027-01-14",
    },
];

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

    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [search, setSearch] = useState("");

    const [activeFilter, setActiveFilter] =
        useState<FleetFilter>("all");

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

        return MOCK_FLEET_VEHICLES.filter((vehicle) => {
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

            {MOCK_FLEET_VEHICLES.length === 0 ? (
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