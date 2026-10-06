"use client";

import React from "react";
import {
    Copy,
    Edit,
    MoreVertical,
    Power,
} from "lucide-react";
import Link from "next/link";

type EmployeeTableActionsProps = {
    status: "active" | "inactive";
    employeeId: string;

    onEdit?: () => void;
    onToggleStatus?: () => void;
};

export default function EmployeeTableActions({
    status,
    employeeId,
    onEdit,
    onToggleStatus,
}: EmployeeTableActionsProps) {
    const isActive = status === "active";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(employeeId);
        } catch {
            // Clipboard denied or unavailable — no-op
        }
    };

    return (
        <div className="flex items-center justify-end gap-3">
            {/* View */}
            <Link
                href={`/organization/employees/${employeeId}`}
                className="text-sm font-medium text-[#FE5720] hover:underline"
            >
                View
            </Link>

            {/* Copy */}
            <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy Employee ID"
                title="Copy Employee ID"
                className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-md
                    text-gray-500
                    transition-colors
                    hover:bg-gray-100
                    hover:text-gray-900
                "
            >
                <Copy
                    className="h-4 w-4"
                    strokeWidth={1.7}
                />
            </button>

            {/* More */}
            <div className="relative">
                <details className="group">
                    <summary
                        className="
                            flex
                            h-8
                            w-8
                            cursor-pointer
                            list-none
                            items-center
                            justify-center
                            rounded-md
                            hover:bg-gray-100
                        "
                    >
                        <MoreVertical
                            className="h-4 w-4 text-gray-600"
                        />
                    </summary>

                    <div
                        className="
                            absolute
                            right-0
                            top-9
                            z-20
                            w-40
                            rounded-md
                            border
                            border-gray-200
                            bg-white
                            py-1
                            shadow-lg
                        "
                    >
                        {/* Edit — hidden when inactive or not permitted */}
                        {isActive && onEdit ? (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <Edit className="h-4 w-4" />
                                Edit
                            </button>
                        ) : null}

                        {/* Activate / Deactivate */}
                        {onToggleStatus ? (
                            <button
                                type="button"
                                onClick={onToggleStatus}
                                className="
                                    flex
                                    w-full
                                    items-center
                                    gap-2
                                    px-3
                                    py-2
                                    text-left
                                    text-sm
                                    text-gray-700
                                    hover:bg-gray-50
                                "
                            >
                                <Power className="h-4 w-4" />

                                {isActive
                                    ? "Deactivate"
                                    : "Activate"}
                            </button>
                        ) : null}
                    </div>
                </details>
            </div>
        </div>
    );
}