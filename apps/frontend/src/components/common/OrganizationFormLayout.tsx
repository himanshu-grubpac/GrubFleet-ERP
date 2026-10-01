"use client";

import type { ReactNode } from "react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";

type OrganizationDashboardTab = {
    label: string;
    href: string;
};

type OrganizationFormLayoutProps = {
    title: string;
    description: string;
    children: ReactNode;
    actions?: ReactNode;
    infoText?: string;
    backHref?: string;
    backLabel?: string;
    tabs?: OrganizationDashboardTab[];
    activeTab?: string;
};

export default function OrganizationFormLayout({
    title,
    description,
    children,
    actions,
    infoText,
    backHref,
    backLabel,
    tabs = [],
    activeTab,
}: OrganizationFormLayoutProps) {
    return (
        <DashboardLayout
            title={title}
            description={description}
            tabs={tabs}
            activeTab={activeTab}
            backHref={backHref}
            backLabel={backLabel}
        >
            <div className="w-full">
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                    {children}

                    {actions ? (
                        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
                            {actions}
                        </div>
                    ) : null}
                </div>

                {infoText ? (
                    <div className="mt-4 flex gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
                        <span className="mt-0.5 shrink-0 font-semibold">
                            i
                        </span>
                        <p>{infoText}</p>
                    </div>
                ) : null}
            </div>
        </DashboardLayout>
    );
}
