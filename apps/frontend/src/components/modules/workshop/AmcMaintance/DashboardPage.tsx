
"use client";

import { useRouter } from "next/navigation";
import { Eye, Info } from "lucide-react";

const tiers = [
    {
        id: "gold",
        name: "Gold",
        description: "4 scheduled services / year + roadside",
        price: "Rs. 3,200 / vehicle",
        subscribers: 9,
    },
    {
        id: "silver",
        name: "Silver",
        description: "2 scheduled services / year",
        price: "Rs. 1,800 / vehicle",
        subscribers: 6,
    },
];

const schedules = [
    {
        id: "cargo-bed-hitch-inspection",
        name: "Cargo bed & hitch inspection",
        assetClass: "Petrol Auto — Cargo",
        interval: "Every 4,000 km",
        vehicles: 2,
        thresholdReached: 1,
    },
    {
        id: "engine-oil-service",
        name: "Engine oil service",
        assetClass: "Petrol Scooter",
        interval: "Every 3,000 km",
        vehicles: 8,
        thresholdReached: 0,
    },
];

export default function AmcMaintenancePage() {
    const router = useRouter();

    return (
        <div className="min-h-full bg-gray-50 px-5 py-4 text-[14px] text-gray-800">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-[14px] font-semibold text-gray-900">
                        AMC &amp; Maintenance
                    </h1>
                    <p className="mt-1 text-xs text-gray-500">
                        Manage maintenance contracts, service schedules, and vehicle maintenance.
                    </p>
                </div>

                <button
                    onClick={() =>
                        router.push("/workshop/amc-maintenance/schedule/create")
                    }
                    className="h-8 shrink-0 rounded-md bg-[#FE5720] px-4 text-xs font-medium text-white hover:bg-[#E94B18]"
                >
                    + Create schedule
                </button>
            </div>

            {/* Summary cards */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard
                    label="Active AMC tiers"
                    value="2"
                    description="Available maintenance plans"
                />
                <SummaryCard
                    label="Active subscriptions"
                    value="15"
                    description="Vehicles covered by AMC"
                />
                <SummaryCard
                    label="Threshold reached"
                    value="1"
                    description="Requires maintenance attention"
                />
            </div>

            {/* AMC Tiers */}
            <section className="mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="px-4 py-3">
                    <h2 className="text-[14px] font-semibold">
                        AMC Tiers
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Contract plans and subscriber usage.
                    </p>
                </div>

                <div className="overflow-x-auto px-4">
                    <table className="w-full min-w-[620px] table-fixed text-left">
                        <thead>
                            <tr className="border-y border-gray-100 text-[10px] font-semibold uppercase text-gray-400">
                                <th className="w-[18%] py-3">Tier</th>
                                <th className="w-[38%] py-3">Plan details</th>
                                <th className="w-[20%] py-3">Subscribers</th>
                                <th className="w-[14%] py-3">Status</th>
                                <th className="w-[10%] py-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {tiers.map((tier) => (
                                <tr
                                    key={tier.id}
                                    className="border-b border-gray-100 last:border-0"
                                >
                                    <td className="py-3 text-xs font-medium">
                                        {tier.name}
                                    </td>

                                    <td className="py-3 pr-2 text-xs text-gray-500">
                                        <p>{tier.description}</p>
                                        <p className="mt-1">{tier.price}</p>
                                    </td>

                                    <td className="py-3 text-xs">
                                        {tier.subscribers} vehicles
                                    </td>

                                    <td className="py-3">
                                        <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700">
                                            Active
                                        </span>
                                    </td>

                                    <td className="py-3 text-right">
                                        <button
                                            aria-label={`View ${tier.name} tier`}
                                            onClick={() =>
                                                router.push(
                                                    `/workshop/amc-maintenance/tiers/${tier.id}`
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
            </section>

            {/* Maintenance Schedules */}
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                        <h2 className="text-[14px] font-semibold">
                            Maintenance Schedules
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Service intervals and vehicle maintenance thresholds.
                        </p>
                    </div>

                    <button
                        onClick={() =>
                            router.push("/workshop/amc-maintenance/schedule/create")
                        }
                        className="h-8 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium hover:bg-gray-50"
                    >
                        + Add schedule
                    </button>
                </div>

                <div className="overflow-x-auto px-4">
                    <table className="w-full min-w-[700px] table-fixed text-left">
                        <thead>
                            <tr className="border-y border-gray-100 text-[10px] font-semibold uppercase text-gray-400">
                                <th className="w-[27%] py-3">Schedule</th>
                                <th className="w-[23%] py-3">Asset class</th>
                                <th className="w-[17%] py-3">Interval</th>
                                <th className="w-[12%] py-3">Vehicles</th>
                                <th className="w-[13%] py-3">Threshold</th>
                                <th className="w-[8%] py-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {schedules.map((schedule) => (
                                <tr
                                    key={schedule.id}
                                    className="border-b border-gray-100 last:border-0"
                                >
                                    <td className="py-3 pr-2 text-xs font-medium">
                                        {schedule.name}
                                    </td>

                                    <td className="py-3 pr-2 text-xs text-gray-500">
                                        {schedule.assetClass}
                                    </td>

                                    <td className="py-3 text-xs">
                                        {schedule.interval}
                                    </td>

                                    <td className="py-3 text-xs">
                                        {schedule.vehicles}
                                    </td>

                                    <td className="py-3">
                                        <span
                                            className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${schedule.thresholdReached > 0
                                                ? "bg-orange-50 text-orange-700"
                                                : "bg-green-50 text-green-700"
                                                }`}
                                        >
                                            {schedule.thresholdReached > 0
                                                ? `${schedule.thresholdReached} reached`
                                                : "On track"}
                                        </span>
                                    </td>

                                    <td className="py-3 text-right">
                                        <button
                                            aria-label={`View ${schedule.name}`}
                                            onClick={() =>
                                                router.push(
                                                    `/workshop/amc-maintenance/schedules/${schedule.id}`
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
                        Maintenance thresholds are informational. When a schedule
                        threshold is reached, a work order should be generated
                        through the existing Workshop workflow.
                    </p>
                </div>
            </section>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    description,
}: {
    label: string;
    value: string;
    description: string;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-2 text-[14px] font-semibold text-gray-900">
                {value}
            </p>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
    );
}
