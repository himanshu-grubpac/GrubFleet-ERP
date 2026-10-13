"use client";

import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";

const SUPPORT_TYPES = [
    {
        title: "Vehicle replacement",
        description:
            "Replace an on-lease vehicle with another available vehicle on the same contract.",
        href: "/fleet-leasing/support/vehicle-replacement/",
    },
] as const;

export default function SupportLandingPage() {
    return (
        <DashboardLayout
            title="Support"
            description="Fleet leasing support actions for contract administrators."
        >
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SUPPORT_TYPES.map((item) => (
                    <li key={item.href}>
                        <Link
                            href={item.href}
                            className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                        >
                            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-[#FE5720]">
                                <ArrowRightLeft className="h-5 w-5" aria-hidden />
                            </span>
                            <span className="text-base font-semibold text-slate-900">
                                {item.title}
                            </span>
                            <span className="mt-2 text-sm text-slate-600">
                                {item.description}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </DashboardLayout>
    );
}
