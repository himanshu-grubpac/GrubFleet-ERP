"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { SubPageBackLink } from "@/components/ui/SubPageBackLink";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { buildDashboardBreadcrumbs } from "@/lib/navigation/dashboard-breadcrumbs";
import LeaseContractStepper from "./LeaseContractStepper";

type NewContractWizardShellProps = {
    currentStep: 1 | 2 | 3 | 4;
    children: React.ReactNode;
};

export default function NewContractWizardShell({
    currentStep,
    children,
}: NewContractWizardShellProps) {
    const pathname = usePathname();

    const resolvedBreadcrumbs = useMemo(
        () =>
            buildDashboardBreadcrumbs(pathname ?? "/", {
                currentLabel: "New contract",
            }),
        [pathname],
    );

    return (
        <div className="-mx-4 -my-4 flex min-h-full flex-col bg-[#f8f8f8] md:-mx-6 md:-my-6">
            <div className="shrink-0 border-b border-gray-200 bg-white px-6 pt-5">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                        <SubPageBackLink
                            href="/fleet-leasing/lease-contracts"
                            label="Back to lease contracts"
                        />
                        <DashboardBreadcrumb items={resolvedBreadcrumbs} />
                        <h1 className="text-xl font-semibold text-gray-900">
                            New lease contract
                        </h1>
                        <p className="text-sm text-gray-500">
                            Create a contract by selecting a client, asset
                            lines, terms, and review.
                        </p>
                    </div>
                </div>
            </div>

            <LeaseContractStepper currentStep={currentStep} />

            <main className="min-h-0 flex-1 p-6 pb-8">
                <div className="w-full">{children}</div>
            </main>
        </div>
    );
}
