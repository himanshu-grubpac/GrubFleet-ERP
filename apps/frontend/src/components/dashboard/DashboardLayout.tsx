"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";

import { SubPageBackLink } from "@/components/ui/SubPageBackLink";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import {
  buildDashboardBreadcrumbs,
  type DashboardBreadcrumbItem,
} from "@/lib/navigation/dashboard-breadcrumbs";

type DashboardTab = {
    label: string;
    href: string;
};

type DashboardLayoutProps = {
    title: string;
    description?: string;
    tabs?: DashboardTab[];
    activeTab?: string;
    action?: React.ReactNode;
    backHref?: string;
    backLabel?: string;
    breadcrumbItems?: DashboardBreadcrumbItem[];
    breadcrumbCurrentLabel?: string;
    children: React.ReactNode;
};

export default function DashboardLayout({
    title,
    description,
    tabs = [],
    activeTab,
    action,
    backHref,
    backLabel,
    breadcrumbItems,
    breadcrumbCurrentLabel,
    children,
}: DashboardLayoutProps) {
    const pathname = usePathname();
    const showBack = Boolean(backHref && backLabel);

    const resolvedBreadcrumbs = useMemo(
        () =>
            buildDashboardBreadcrumbs(pathname ?? "/", {
                items: breadcrumbItems,
                currentLabel: breadcrumbCurrentLabel,
            }),
        [pathname, breadcrumbItems, breadcrumbCurrentLabel],
    );

    return (
        <div className="-mx-4 -my-4 flex min-h-full flex-col bg-[#f8f8f8] md:-mx-6 md:-my-6">
            {/* Header */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-6 pt-5">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                        {showBack ? (
                            <SubPageBackLink
                                href={backHref!}
                                label={backLabel!}
                            />
                        ) : null}
                        <DashboardBreadcrumb items={resolvedBreadcrumbs} />
                        <h1 className="text-xl font-semibold text-gray-900">
                            {title}
                        </h1>

                        {description && (
                            <p className="mt-1 text-sm text-gray-500">
                                {description}
                            </p>
                        )}
                    </div>

                    {action && <div className="shrink-0 pl-4">{action}</div>}
                </div>

                {/* Sub navigation */}
                {tabs.length > 0 && (
                    <nav className="mt-5 flex gap-6">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.href;

                            return (
                                <a
                                    key={tab.href}
                                    href={tab.href}
                                    className={[
                                        "border-b-2 pb-3 text-sm font-medium transition-colors",
                                        isActive
                                            ? "border-[#FE5720] text-[#FE5720]"
                                            : "border-transparent text-gray-500 hover:text-gray-900",
                                    ].join(" ")}
                                >
                                    {tab.label}
                                </a>
                            );
                        })}
                    </nav>
                )}
            </div>

            {/* Content */}
            <main className="min-h-0 flex-1 p-6 pb-8">{children}</main>
        </div>
    );
}
