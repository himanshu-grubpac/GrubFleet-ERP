"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
    fetchAssetRegisterVehicleApi,
    fetchAssetRegisterVehicleLeaseHistoryApi,
    type AssetRegisterVehicleLeaseHistoryItem,
} from "@/lib/api/asset-register/vehicles";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";

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
    status: AssetRegisterVehicleLeaseHistoryItem["status"],
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
    const { token, organizationId, isLoading: isAuthLoading } = useAuth();

    const assetId = String(params.id);

    const vehicleQuery = useQuery({
        queryKey: ["asset-register", "vehicles", organizationId, assetId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterVehicleApi({
                token,
                organizationId,
                id: assetId,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const leaseHistoryQuery = useQuery({
        queryKey: [
            "asset-register",
            "vehicles",
            organizationId,
            assetId,
            "lease-history",
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterVehicleLeaseHistoryApi({
                token,
                organizationId,
                id: assetId,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const asset: FleetAsset | undefined = vehicleQuery.data
        ? {
              id: vehicleQuery.data.id,
              fleetCode: vehicleQuery.data.fleetCode,
              assetClass: vehicleQuery.data.assetClassName,
              registrationNumber: vehicleQuery.data.registrationNumber,
              status: vehicleQuery.data.operationalStatus as FleetStatus,
          }
        : undefined;

    /* ========================================================
       NOT FOUND
    ======================================================== */

    if (
        vehicleQuery.isLoading ||
        leaseHistoryQuery.isLoading ||
        isAuthLoading
    ) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] px-6 py-6 text-sm text-gray-500">
                Loading lease history…
            </div>
        );
    }

    if (leaseHistoryQuery.isError) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] px-6 py-6 text-sm text-red-600">
                Could not load lease history.
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] px-6 py-6">
                <div className="w-full">
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

    const leaseHistory = (leaseHistoryQuery.data ?? []).map((record) => ({
        ...record,
        date: formatCalendarDateEnIn(record.date) ?? record.date,
        leaseStartDate:
            formatCalendarDateEnIn(record.leaseStartDate) ??
            record.leaseStartDate,
        leaseEndDate:
            record.leaseEndDate === "—"
                ? record.leaseEndDate
                : (formatCalendarDateEnIn(record.leaseEndDate) ??
                  record.leaseEndDate),
    }));

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
            <div className="w-full px-6 py-5">

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
                                a lease. Per-vehicle lease history API
                                is not shipped yet — counts and rows will
                                appear here when backend exposes them.
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