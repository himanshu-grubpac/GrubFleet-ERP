"use client";

import { useMemo, useState } from "react";
import { Search, PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AssetAssignmentVehicle = {
    id: string;
    fleetCode: string;
    assetClass: string;
    registrationNumber: string;
    odometer: number;
    availableSince: string;
};

/* -------------------------------------------------------------------------- */
/* Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_ASSIGNMENT_VEHICLES: AssetAssignmentVehicle[] = [
    {
        id: "vehicle-001",
        fleetCode: "VH-1001",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1001",
        odometer: 12480,
        availableSince: "14-Mar-2023",
    },

    {
        id: "vehicle-002",
        fleetCode: "VH-1002",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1002",
        odometer: 8930,
        availableSince: "02-Jun-2023",
    },

    {
        id: "vehicle-005",
        fleetCode: "VH-1005",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1005",
        odometer: 3220,
        availableSince: "19-Jan-2026",
    },

    {
        id: "vehicle-008",
        fleetCode: "VH-1008",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1008",
        odometer: 9540,
        availableSince: "05-Feb-2026",
    },

    {
        id: "vehicle-010",
        fleetCode: "VH-1010",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1010",
        odometer: 0,
        availableSince: "20-Aug-2026",
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatOdometer = (value: number) => {
    return `${value.toLocaleString("en-IN")} km`;
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AssetAssignmentDashboardPage() {
    const router = useRouter();

    /* ---------------------------------------------------------------------- */
    /* State                                                                  */
    /* ---------------------------------------------------------------------- */

    const [search, setSearch] = useState("");

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                             */
    /* ---------------------------------------------------------------------- */

    const handleAssign = (
        vehicle: AssetAssignmentVehicle,
    ) => {
        /*
         * Keep the vehicle id available for the
         * lease-contract assignment flow.
         *
         * Update this route once the final assignment
         * route/contract selection flow is confirmed.
         */

        router.push(
            `/asset-register/asset-assign/${vehicle.id}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Filtering                                                              */
    /* ---------------------------------------------------------------------- */

    const filteredVehicles = useMemo(() => {
        const searchValue = search
            .trim()
            .toLowerCase();

        if (!searchValue) {
            return MOCK_ASSIGNMENT_VEHICLES;
        }

        return MOCK_ASSIGNMENT_VEHICLES.filter(
            (vehicle) =>
                vehicle.fleetCode
                    .toLowerCase()
                    .includes(searchValue) ||
                vehicle.assetClass
                    .toLowerCase()
                    .includes(searchValue) ||
                vehicle.registrationNumber
                    .toLowerCase()
                    .includes(searchValue),
        );
    }, [search]);

    /* ---------------------------------------------------------------------- */
    /* Clear Search                                                           */
    /* ---------------------------------------------------------------------- */

    const handleClearSearch = () => {
        setSearch("");
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                          */
    /* ---------------------------------------------------------------------- */

    const assignmentColumns = [
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

            render: (
                vehicle: AssetAssignmentVehicle,
            ) => (
                <span className="text-gray-700">
                    {formatOdometer(
                        vehicle.odometer,
                    )}
                </span>
            ),
        },

        {
            key: "availableSince",
            label: "AVAILABLE SINCE",
        },
    ];

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <DashboardLayout
            title="Asset Assignment"
            description="Available vehicles ready to be assigned to a lease contract."
        >
            {/* ---------------------------------------------------------------- */}
            {/* Search                                                           */}
            {/* ---------------------------------------------------------------- */}

            <div className="mb-4 flex items-center gap-3">
                <div className="relative min-w-0 flex-1">
                    <Search
                        className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                        strokeWidth={1.8}
                    />

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value,
                            )
                        }
                        placeholder="Search by fleet code or registration number"
                        className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                    />
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Empty / Table                                                     */}
            {/* ---------------------------------------------------------------- */}

            {MOCK_ASSIGNMENT_VEHICLES.length ===
                0 ? (
                <DashboardEmptyState
                    icon={
                        <PackageSearch
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No vehicles available"
                    description="There are currently no vehicles available for lease assignment."
                    buttonLabel="Refresh"
                    onButtonClick={() => {
                        console.log(
                            "Refresh available vehicles",
                        );
                    }}
                />
            ) : filteredVehicles.length ===
                0 ? (
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

                    <button
                        type="button"
                        onClick={
                            handleClearSearch
                        }
                        className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
                    >
                        Clear search
                    </button>
                </div>
            ) : (
                <DashboardTable
                    columns={assignmentColumns}
                    data={filteredVehicles}
                    getRowKey={(vehicle) =>
                        vehicle.id
                    }
                    renderActions={(
                        vehicle,
                    ) => (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                handleAssign(
                                    vehicle,
                                )
                            }
                            className="h-7 rounded-md border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Assign
                        </Button>
                    )}
                />
            )}
        </DashboardLayout>
    );
}