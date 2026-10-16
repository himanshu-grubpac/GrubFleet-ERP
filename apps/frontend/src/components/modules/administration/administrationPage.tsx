
"use client";

import { ShieldCheck } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ModuleHubQuickLinksSection } from "@/components/dashboard/ModuleHubQuickLinksSection";

export default function AdministrationPage() {
    return (
        <DashboardLayout
            title="Administration"
            description="Manage roles, permissions, user access, and administrative settings."
        >
            <div className="space-y-6">
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
                            <ShieldCheck className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-gray-900">
                                Administration Overview
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Control application access by managing
                                roles, permissions, users, and
                                administrative configurations in one place.
                            </p>
                        </div>
                    </div>
                </section>

                <ModuleHubQuickLinksSection
                    moduleRootHref="/administration/"
                    subtitle="Select an administration section to continue."
                />
            </div>
        </DashboardLayout>
    );
}
