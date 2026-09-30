"use client";

import type { ReactNode } from "react";

import DashboardHeader from "@/components/dashboard/DashboardHeader";

type OrganizationFormLayoutProps = {
    title: string;
    description: string;
    children: ReactNode;
    actions?: ReactNode;
    infoText?: string;
};

export default function OrganizationFormLayout({
    title,
    description,
    children,
    actions,
    infoText,
}: OrganizationFormLayoutProps) {
    return (
        <div className="w-full">

            {/* ---------------------------------------------------------- */}
            {/* Common Organization Form Content                          */}
            {/* ---------------------------------------------------------- */}
            <div className="ml-6 pt-4">

                {/* Header */}

                <DashboardHeader
                    title={title}
                    description={description}
                />

                {/* Form */}

                <div className="mt-5 w-[72%] max-w-[920px]">

                    <div className="rounded-lg border border-gray-200 bg-white p-5">

                        {children}

                        {/* Actions */}

                        {actions && (
                            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
                                {actions}
                            </div>
                        )}
                    </div>

                    {/* Information */}

                    {infoText && (
                        <div className="mt-4 flex gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
                            <span className="mt-0.5 shrink-0 font-semibold">
                                i
                            </span>

                            <p>{infoText}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}