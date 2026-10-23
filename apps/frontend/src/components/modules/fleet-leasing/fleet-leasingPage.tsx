
"use client";

import { FileText } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ModuleHubQuickLinksSection } from "@/components/dashboard/ModuleHubQuickLinksSection";

export default function LeaseContractsPage() {
    return (
        <DashboardLayout
            title="Fleet & Leasing"
            description="Manage lease contracts, renewals, extensions, and fleet leasing support."
        >
            <div className="space-y-6">
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
                            <FileText className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-gray-900">
                                Fleet & Leasing Overview
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Manage client leases, track contract
                                renewals, and open support workflows
                                from one place.
                            </p>
                        </div>
                    </div>
                </section>

                <ModuleHubQuickLinksSection moduleRootHref="/fleet-leasing/" />


            </div>
        </DashboardLayout>
    );
}
