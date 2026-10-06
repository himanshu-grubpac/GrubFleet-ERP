"use client";

import React from "react";
import { Inbox } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

type DashboardEmptyStateProps = {
    title: string;
    description?: string;
    buttonLabel?: string;
    onButtonClick?: () => void;
    icon?: React.ReactNode;
};

export default function DashboardEmptyState({
    title,
    description,
    buttonLabel,
    onButtonClick,
    icon,
}: DashboardEmptyStateProps) {
    return (
        <div className="w-full rounded-lg border border-gray-200 bg-white">
            <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-8 text-center">
                {/* Icon */}
                <div className="mb-3 flex h-10 w-10 items-center justify-center text-gray-400">
                    {icon ?? (
                        <Inbox
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-gray-900">
                    {title}
                </h3>

                {/* Description */}
                {description && (
                    <p className="mt-1 max-w-md text-xs text-gray-500">
                        {description}
                    </p>
                )}


            </div>
        </div>
    );
}