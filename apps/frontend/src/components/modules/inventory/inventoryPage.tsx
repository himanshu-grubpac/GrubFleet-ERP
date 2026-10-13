
"use client";

import Link from "next/link";
import {
    ArrowRight,
    ClipboardList,
    Package,
    Boxes,
    Receipt,
    ClipboardCheck,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { internalHref } from "@/lib/navigation/nav-path-match";

const inventoryModules = [
    {
        title: "Stock Register",
        description:
            "Manage parts, stock item details, units of measure, and pricing information.",
        href: "/inventory/Stock-register/",
        icon: Package,
    },
    {
        title: "Stock Balance",
        description:
            "View current stock quantities across workshops, warehouses, and other locations.",
        href: "/inventory/stock-balance/",
        icon: Boxes,
    },
    {
        title: "Stock Receipt",
        description:
            "Record incoming stock and update on-hand quantities through stock receipts.",
        href: "/inventory/stock-receipt/",
        icon: Receipt,
    },
    {
        title: "Parts Requests",
        description:
            "Manage parts requests and track fulfilment for workshop requirements.",
        href: "/inventory/parts-requests/",
        icon: ClipboardCheck,
    },
];

export default function InventoryPage() {
    return (
        <DashboardLayout
            title="Inventory"
            description="Manage stock records, stock balances, receipts, and parts requests."
        >
            <div className="space-y-6">
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
                            <ClipboardList className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-gray-900">
                                Inventory Overview
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage parts availability, monitor stock levels,
                                record incoming stock, and fulfil parts requests
                                from one place.
                            </p>
                        </div>
                    </div>
                </section>

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
                        {inventoryModules.map((module) => {
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
