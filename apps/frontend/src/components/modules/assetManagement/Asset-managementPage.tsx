"use client";

import { Boxes } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ModuleHubQuickLinksSection } from "@/components/dashboard/ModuleHubQuickLinksSection";

export default function AssetManagementPage() {
    return (
        <DashboardLayout
            title="Asset Management"
            description="Manage asset classes, asset records, fleet vehicles, assignments, and compliance."
        >
            <div className="space-y-6">
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

                <ModuleHubQuickLinksSection moduleRootHref="/asset-register/" />
            </div>
        </DashboardLayout>
    );
}
