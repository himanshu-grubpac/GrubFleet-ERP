"use client";

import Link from "next/link";
import {
    ArrowRight,
    Boxes,
    CarFront,
    ClipboardCheck,
    FileCheck2,
    Layers3,
    Truck,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { internalHref } from "@/lib/navigation/nav-path-match";

const assetManagementModules = [
    {
        title: "Asset Classes",
        description:
            "Create and manage asset classes, vehicle types, and default specifications.",
        href: "/asset-register/assestclass/",
        icon: Layers3,
    },
    {
        title: "Asset Master",
        description:
            "Manage asset master records, vehicle details, and asset specifications.",
        href: "/asset-register/asset-master/",
        icon: Boxes,
    },
    {
        title: "Fleet Register",
        description:
            "View and manage fleet vehicles, registration details, and vehicle information.",
        href: "/asset-register/fleetregister/",
        icon: Truck,
    },
    {
        title: "Asset Assignment",
        description:
            "Manage asset assignments and track assets allocated to employees or locations.",
        href: "/asset-register/asset-assign/",
        icon: CarFront,
    },
    {
        title: "Compliance & Renewals",
        description:
            "Track vehicle compliance, insurance renewals, and important expiry dates.",
        href: "/asset-register/compliance-renewals/",
        icon: FileCheck2,
    },
];

export default function AssetManagementPage() {
    return (
        <DashboardLayout
            title="Asset Management"
            description="Manage asset classes, asset records, fleet vehicles, assignments, and compliance."
        >
            <div className="space-y-6">
                {/* Asset Management Overview */}
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
                            <Boxes className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-gray-900">
                                Asset Management Overview
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Access asset records, fleet information,
                                assignments, and compliance features from
                                one place.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Quick Links */}
                <section>
                    <div className="mb-4">
                        <h2 className="text-base font-semibold text-gray-900">
                            Quick Links
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Select a section to continue.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {assetManagementModules.map((module) => {
                            const Icon = module.icon;

                            return (
                                <Link
                                    key={module.href}
                                    href={internalHref(module.href)}
                                    className="group rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-[#FE5720]/50 hover:bg-orange-50/20"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors group-hover:bg-orange-100 group-hover:text-[#FE5720]">
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        <ArrowRight className="h-4 w-4 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-[#FE5720]" />
                                    </div>

                                    <h3 className="mt-4 text-sm font-semibold text-gray-900 group-hover:text-[#FE5720]">
                                        {module.title}
                                    </h3>

                                    <p className="mt-2 min-h-10 text-xs leading-5 text-gray-500">
                                        {module.description}
                                    </p>

                                    <div className="mt-4 border-t border-gray-100 pt-3">
                                        <span className="text-xs font-medium text-[#FE5720]">
                                            Open section
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}