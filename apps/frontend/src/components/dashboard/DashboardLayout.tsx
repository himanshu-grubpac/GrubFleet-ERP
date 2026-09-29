"use client";

import React from "react";

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
    children: React.ReactNode;
};

export default function DashboardLayout({
    title,
    description,
    tabs = [],
    activeTab,
    action,
    children,
}: DashboardLayoutProps) {
    return (
        <div className="flex min-h-full flex-col bg-[#f8f8f8]">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 pt-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            {title}
                        </h1>

                        {description && (
                            <p className="mt-1 text-sm text-gray-500">
                                {description}
                            </p>
                        )}
                    </div>

                    {action && <div>{action}</div>}
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
            <main className="flex-1 p-6">
                {children}
            </main>
        </div>
    );
}