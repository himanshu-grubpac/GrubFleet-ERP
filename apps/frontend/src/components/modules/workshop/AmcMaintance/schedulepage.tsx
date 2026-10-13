
"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, Info } from "lucide-react";

const vehicles = [
    {
        code: "VH-2001",
        assetClass: "Petrol Auto — Cargo",
        odometer: "4,004 km",
        status: "Threshold reached",
    },
    {
        code: "VH-2004",
        assetClass: "Petrol Auto — Cargo",
        odometer: "1,800 km",
        status: "On schedule",
    },
];

export default function AmcScheduleDetailsPage() {
    const router = useRouter();
    const params = useParams();

    const scheduleId = String(params.id ?? "");
    const scheduleName =
        scheduleId === "cargo-bed-hitch-inspection"
            ? "Cargo bed & hitch inspection"
            : scheduleId
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

    return (
        <main className="min-h-full bg-gray-50 px-5 py-4 text-[14px] text-gray-800">
            {/* Breadcrumb */}
            <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <button
                    onClick={() => router.push("/workshop/amc-maintenance")}
                    className="hover:text-[#FE5720]"
                >
                    AMC &amp; Maintenance
                </button>
                <span>/</span>
                <span className="text-gray-800">{scheduleName}</span>
            </nav>

            {/* Header */}
            <header className="mb-5 flex items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-[14px] font-semibold text-gray-900">
                            {scheduleName}
                        </h1>

                        <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700">
                            Active
                        </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                        Petrol Auto — Cargo · Preventive maintenance · Leased
                    </p>
                </div>

                <button
                    onClick={() =>
                        router.push(
                            `/workshop/amc-maintenance/schedules/${scheduleId}/edit`
                        )
                    }
                    className="h-8 shrink-0 rounded-md border border-gray-200 bg-white px-4 text-xs font-medium hover:bg-gray-50"
                >
                    Edit schedule
                </button>
            </header>

            {/* Schedule Details */}
            <section className="mb-5 max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white">
                <h2 className="px-4 pt-4 text-[10px] font-semibold text-gray-400">
                    SCHEDULE DETAILS
                </h2>

                <div className="px-4 pb-2">
                    <InfoRow label="Schedule name" value={scheduleName} />
                    <InfoRow label="Asset class" value="Petrol Auto — Cargo" />
                    <InfoRow label="Maintenance type" value="Preventive maintenance (PM)" />
                    <InfoRow label="Service interval" value="Every 4,000 km" />
                    <InfoRow label="Applicable to" value="Leased vehicles" />
                    <InfoRow label="Vehicles on schedule" value="2" />
                </div>
            </section>

            {/* Vehicles */}
            <section className="max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="px-4 py-3">
                    <h2 className="text-[14px] font-semibold text-gray-800">
                        Vehicles on this schedule
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Vehicle mileage and current maintenance threshold status.
                    </p>
                </div>

                <div className="overflow-x-auto px-4">
                    <table className="w-full min-w-[650px] table-fixed text-left">
                        <thead>
                            <tr className="border-y border-gray-100 text-[10px] font-semibold uppercase text-gray-400">
                                <th className="w-[20%] py-3">Fleet code</th>
                                <th className="w-[28%] py-3">Asset class</th>
                                <th className="w-[18%] py-3">Odometer</th>
                                <th className="w-[24%] py-3">Status</th>
                                <th className="w-[10%] py-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {vehicles.map((vehicle) => (
                                <tr
                                    key={vehicle.code}
                                    className="border-b border-gray-100 last:border-0"
                                >
                                    <td className="py-3 text-xs font-medium">
                                        {vehicle.code}
                                    </td>

                                    <td className="py-3 pr-2 text-xs text-gray-500">
                                        {vehicle.assetClass}
                                    </td>

                                    <td className="py-3 text-xs">
                                        {vehicle.odometer}
                                    </td>

                                    <td className="py-3">
                                        <span
                                            className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${vehicle.status === "On schedule"
                                                    ? "bg-green-50 text-green-700"
                                                    : "bg-orange-50 text-orange-700"
                                                }`}
                                        >
                                            {vehicle.status}
                                        </span>
                                    </td>

                                    <td className="py-3 text-right">
                                        <button
                                            aria-label={`View work order for ${vehicle.code}`}
                                            onClick={() =>
                                                router.push(
                                                    "/workshop/work-orders/WO-2026-1201"
                                                )
                                            }
                                            className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
                                        >
                                            <Eye size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-start gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <p>
                        Threshold reached is informational and does not block service.
                        When the maintenance threshold is reached, a work order should
                        be generated through the existing Workshop workflow.
                    </p>
                </div>
            </section>

            {/* Back */}
            <button
                onClick={() => router.push("/workshop/amc-maintenance")}
                className="mt-5 inline-flex h-8 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium hover:bg-gray-50"
            >
                <ArrowLeft size={14} />
                Back to AMC &amp; Maintenance
            </button>
        </main>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex min-h-[36px] items-center justify-between gap-4 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-right text-xs font-medium text-gray-800">
                {value}
            </span>
        </div>
    );
}
