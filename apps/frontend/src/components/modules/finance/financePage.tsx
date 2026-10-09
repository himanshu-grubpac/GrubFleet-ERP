
"use client";

import Link from "next/link";
import {
    ArrowRight,
    Wallet,
    FileText,
    Receipt,
    CreditCard,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { internalHref } from "@/lib/navigation/nav-path-match";

const financeModules = [
    {
        title: "Invoices",
        description:
            "Manage invoices, review billing records, and track invoice status.",
        href: "/finance/invoices/",
        icon: FileText,
    },
    {
        title: "Client Statements",
        description:
            "Review client account statements and outstanding balances.",
        href: "/finance/client-statements/",
        icon: Receipt,
    },
    {
        title: "Vendor Payments",
        description:
            "Manage vendor payment records and track payment status.",
        href: "/finance/vendor-payments/",
        icon: CreditCard,
    },
];

export default function FinancePage() {
    return (
        <DashboardLayout
            title="Finance"
            description="Manage invoices, client statements, and vendor payments."
        >
            <div className="space-y-6">
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
                            <Wallet className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-gray-900">
                                Finance Overview
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Access billing records, monitor client
                                balances, and manage vendor payments from
                                one place.
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
                        {financeModules.map((module) => {
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
