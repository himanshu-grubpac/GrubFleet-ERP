"use client";

import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Eye, Info } from "lucide-react";

const subscribers = [
    {
        code: "VH-1009",
        owner: "Suresh Pillai",
        used: "3 of 4",
        status: "Within limit",
    },
    {
        code: "VH-2005",
        owner: "Rakesh Iyer",
        used: "4 of 4",
        status: "Limit reached",
    },
];

export default function AmcTierDetailsPage() {
    const router = useRouter();
    const params = useParams();

    const tierId = String(params.id ?? "gold");
    const tierName =
        tierId.toLowerCase() === "gold"
            ? "Gold"
            : tierId.charAt(0).toUpperCase() + tierId.slice(1);

    return (
        <div className="min-h-full bg-gray-50 px-5 py-4 text-[14px] text-gray-800">
            {/* Breadcrumb */}
            <div className="mb-5 flex items-center gap-2 text-xs text-gray-500">
                <button
                    onClick={() => router.push("/workshop/amc-maintenance")}
                    className="hover:text-[#FE5720]"
                >
                    AMC &amp; Maintenance
                </button>
                <span>/</span>
                <span className="text-gray-800">{tierName}</span>
            </div>

            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-[14px] font-semibold text-gray-900">
                            {tierName}
                        </h1>

                        <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700">
                            9 active subscriptions
                        </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                        4 scheduled services / year + roadside — Rs. 3,200 / vehicle.
                    </p>
                </div>

                <button
                    onClick={() =>
                        router.push(
                            `/workshop/amc-maintenance/tiers/${tierId}/edit`
                        )
                    }
                    className="h-8 shrink-0 rounded-md border border-gray-200 bg-white px-4 text-xs font-medium hover:bg-gray-50"
                >
                    Edit tier
                </button>
            </div>

            {/* Tier Details */}
            <section className="mb-5 max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white">
                <h2 className="px-4 pt-4 text-[10px] font-semibold text-gray-400">
                    TIER DETAILS
                </h2>

                <div className="px-4 pb-2">
                    <InfoRow label="Tier name" value={tierName} />
                    <InfoRow
                        label="Included services"
                        value="4 scheduled services per year"
                    />
                    <InfoRow
                        label="Additional benefit"
                        value="Roadside assistance"
                    />
                    <InfoRow
                        label="Annual price"
                        value="Rs. 3,200 / vehicle"
                    />
                    <InfoRow label="Active subscribers" value="9" />
                    <InfoRow label="Status" value="Active" />
                </div>
            </section>

            {/* Subscribers */}
            <section className="max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="px-4 py-3">
                    <h2 className="text-[14px] font-semibold">
                        Subscribers &amp; Usage
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Service usage for vehicles subscribed to this tier.
                    </p>
                </div>

                <div className="overflow-x-auto px-4">
                    <table className="w-full min-w-[580px] table-fixed text-left">
                        <thead>
                            <tr className="border-y border-gray-100 text-[10px] font-semibold uppercase text-gray-400">
                                <th className="w-[22%] py-3">Fleet code</th>
                                <th className="w-[28%] py-3">Owner</th>
                                <th className="w-[20%] py-3">Services used</th>
                                <th className="w-[22%] py-3">Status</th>
                                <th className="w-[8%] py-3 text-right">View</th>
                            </tr>
                        </thead>

                        <tbody>
                            {subscribers.map((subscriber) => (
                                <tr
                                    key={subscriber.code}
                                    className="border-b border-gray-100 last:border-0"
                                >
                                    <td className="py-3 text-xs">
                                        {subscriber.code}
                                    </td>

                                    <td className="py-3 text-xs">
                                        {subscriber.owner}
                                    </td>

                                    <td className="py-3 text-xs">
                                        {subscriber.used}
                                    </td>

                                    <td className="py-3">
                                        <span
                                            className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${subscriber.status === "Within limit"
                                                    ? "bg-green-50 text-green-700"
                                                    : "bg-orange-50 text-orange-700"
                                                }`}
                                        >
                                            {subscriber.status}
                                        </span>
                                    </td>

                                    <td className="py-3 text-right">
                                        <button
                                            aria-label={`View ${subscriber.code}`}
                                            onClick={() =>
                                                router.push(
                                                    `/workshop/amc-maintenance/subscribers/${subscriber.code}`
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
                        Subscriber records originate from Finance asset-sale invoices.
                        Service usage and subscription status should come from the
                        application data once the API is connected.
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
        </div>
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