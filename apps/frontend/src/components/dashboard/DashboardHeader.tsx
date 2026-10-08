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
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
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
                <div className="shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
}