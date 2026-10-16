"use client";

import React from "react";

type DashboardHeaderProps = {
    title: string;
    description?: string;
    action?: React.ReactNode;
};

export default function DashboardHeader({
    title,
    description,
    action,
}: DashboardHeaderProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold text-gray-900">
                    {title}
                </h1>

                {description && (
                    <p className="mt-1 text-sm text-gray-500">
                        {description}
                    </p>
                )}
            </div>

            {action && (
                <div className="w-full shrink-0 sm:w-auto">
                    {action}
                </div>
            )}
        </div>
    );
}