"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/GrubpacButton";

/* ============================================================
   TYPES
============================================================ */

type FleetStatus = "available" | "leased" | "workshop" | "sold";

type FleetAsset = {
    id: string;
    fleetCode: string;
    assetClass: string;
    registrationNumber: string;
    status: FleetStatus;
};

type LeaseHistoryRecord = {
    id: string;
    date: string;
    lessee: string;
    leaseStartDate: string;
    leaseEndDate: string;
    status: "Active" | "Completed" | "Cancelled";
    changedBy: string;
};

/* ============================================================
   MOCK FLEET DATA
   Replace this with API data later.
============================================================ */

const MOCK_FLEET_ASSETS: FleetAsset[] = [
    {
        id: "vehicle-001",
        fleetCode: "VH-1001",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1001",
        status: "available",
    },
    {
        id: "vehicle-002",
        fleetCode: "VH-1002",
        assetClass: "Petrol Scooter — Standard",
        registrationNumber: "MH04 AB 1002",
        status: "available",
    },
];

/* ============================================================
   MOCK LEASE HISTORY
   Keep this empty when the vehicle has no lease history.

   Example records are provided so you can see how the populated
   state will look. You can remove them when connecting the API.
============================================================ */

const MOCK_LEASE_HISTORY: Record<string, LeaseHistoryRecord[]> = {
    "vehicle-001": [
        /*
        {
            id: "lease-history-001",
            date: "27-Aug-2026",
            lessee: "ABC Logistics Pvt. Ltd.",
            leaseStartDate: "01-Sep-2026",
            leaseEndDate: "31-Aug-2027",
            status: "Active",
            changedBy: "Devraj Malhotra",
        },
        {
            id: "lease-history-002",
            date: "14-Mar-2025",
            lessee: "XYZ Transport Pvt. Ltd.",
            leaseStartDate: "14-Mar-2025",
            leaseEndDate: "13-Mar-2026",
            status: "Completed",
            changedBy: "Ishita Kamble",
        },
        */
    ],

    "vehicle-002": [],
};

/* ============================================================
   STATUS HELPERS
============================================================ */

function getStatusLabel(status: FleetStatus) {
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
}

function getStatusClass(status: FleetStatus) {
    switch (status) {
        case "available":
            return "bg-green-50 text-green-700 border-green-200";

        case "leased":
            return "bg-blue-50 text-blue-700 border-blue-200";

        case "workshop":
            return "bg-yellow-50 text-yellow-700 border-yellow-200";

        case "sold":
            return "bg-gray-100 text-gray-600 border-gray-200";

        default:
            return "bg-gray-50 text-gray-600 border-gray-200";
    }
}

function getLeaseStatusClass(
    status: LeaseHistoryRecord["status"],
) {
    switch (status) {
        case "Active":
            return "bg-green-50 text-green-700 border-green-200";

        case "Completed":
            return "bg-gray-50 text-gray-600 border-gray-200";

        case "Cancelled":
            return "bg-red-50 text-red-600 border-red-200";

        default:
            return "bg-gray-50 text-gray-600 border-gray-200";
    }
}

/* ============================================================
   PAGE
============================================================ */

export default function FleetLeaseHistoryPage() {
    const params = useParams();
    const router = useRouter();

    const assetId = String(params.id);

    const asset = MOCK_FLEET_ASSETS.find(
        (item) => item.id === assetId,
    );

    /* ========================================================
       NOT FOUND
    ======================================================== */

    if (!asset) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] px-6 py-6">
                <div className="mx-auto max-w-[1100px]">
                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/asset-register/fleetregister",
                            )
                        }
                        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#FE5720]"
                    >
                        <ArrowLeft size={16} />
                        Back to Fleet Register
                    </button>

                    <div className="rounded-lg border border-gray-200 bg-white px-6 py-10 text-center">
                        <h2 className="text-sm font-semibold text-gray-800">
                            Vehicle not found
                        </h2>

                        <p className="mt-1 text-xs text-gray-500">
                            The requested fleet vehicle could not be
                            found.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const leaseHistory =
        MOCK_LEASE_HISTORY[asset.id] ?? [];

    const hasHistory = leaseHistory.length > 0;

    /* ========================================================
       HANDLERS
    ======================================================== */

    const handleBack = () => {
        router.push(
            `/asset-register/fleetregister/${asset.id}`,
        );
    };

    const handleEdit = () => {
        router.push(
            `/asset-register/fleetregister/${asset.id}/edit`,
        );
    };

    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <div className="min-h-screen bg-[#f7f7f7]">
            <div className="mx-auto w-full max-w-[1100px] px-6 py-5">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="mb-5 flex items-start justify-between">

                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-[18px] font-semibold text-gray-900">
                                Lease History — {asset.fleetCode}
                            </h1>

                            <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusClass(
                                    asset.status,
                                )}`}
                            >
                                {getStatusLabel(asset.status)}
                            </span>
                        </div>

                        <p className="mt-1 text-[11px] text-gray-500">
                            {asset.assetClass} · {asset.registrationNumber}
                        </p>

                        <p className="mt-1 text-[11px] text-gray-400">
                            Every lease assignment and lease status
                            change is recorded here.
                        </p>
                    </div>

                    {/* ==================================================
                        ACTIONS
                    ================================================== */}
                </div>

                {/* ==================================================
                    LEASE HISTORY CARD
                ================================================== */}

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    {!hasHistory ? (
                        /* ==================================================
                           EMPTY STATE
                        ================================================== */

                        <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10">
                            <h2 className="text-[12px] font-semibold text-gray-800">
                                No lease history recorded yet
                            </h2>

                            <p className="mt-1 text-[11px] text-gray-400">
                                This vehicle has not been assigned to
                                a lease.
                            </p>
                        </div>
                    ) : (
                        /* ==================================================
                           POPULATED HISTORY
                        ================================================== */

                        <div className="w-full overflow-x-auto">
                            <table className="w-full min-w-[780px] border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="px-4 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                            Date
                                        </th>

                                        <th className="px-4 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                            Lessee / Customer
                                        </th>

                                        <th className="px-4 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                            Lease Period
                                        </th>

                                        <th className="px-4 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                            Status
                                        </th>

                                        <th className="px-4 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                                            Changed By
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {leaseHistory.map(
                                        (record) => (
                                            <tr
                                                key={record.id}
                                                className="border-b border-gray-100 last:border-b-0"
                                            >
                                                {/* DATE */}
                                                <td className="px-4 py-2.5 text-[10px] font-medium text-gray-600">
                                                    {record.date}
                                                </td>

                                                {/* LESSEE */}
                                                <td className="px-4 py-2.5 text-[10px] font-semibold text-gray-800">
                                                    {record.lessee}
                                                </td>

                                                {/* LEASE PERIOD */}
                                                <td className="px-4 py-2.5 text-[10px] text-gray-600">
                                                    <span>
                                                        {
                                                            record.leaseStartDate
                                                        }
                                                    </span>

                                                    <span className="mx-1 text-gray-400">
                                                        →
                                                    </span>

                                                    <span>
                                                        {
                                                            record.leaseEndDate
                                                        }
                                                    </span>
                                                </td>

                                                {/* STATUS */}
                                                <td className="px-4 py-2.5">
                                                    <span
                                                        className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-medium ${getLeaseStatusClass(
                                                            record.status,
                                                        )}`}
                                                    >
                                                        {
                                                            record.status
                                                        }
                                                    </span>
                                                </td>

                                                {/* CHANGED BY */}
                                                <td className="px-4 py-2.5 text-[10px] text-gray-600">
                                                    {
                                                        record.changedBy
                                                    }
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}