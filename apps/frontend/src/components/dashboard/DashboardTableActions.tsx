"use client";

import React from "react";
import { Copy, Edit, MoreVertical, Power } from "lucide-react";
import Link from "next/link";

import Button from "@/components/ui/GrubpacButton";

type DashboardTableActionsProps = {
    status: "active" | "inactive";
    locationId: string;

    onCopy: () => void;
    onEdit: () => void;
    onToggleStatus: () => void;
};

export default function DashboardTableActions({
    status,
    locationId,
    onCopy,
    onEdit,
    onToggleStatus,
}: DashboardTableActionsProps) {
    const isActive = status === "active";

    return (
        <div className="flex items-center justify-end gap-2">
            {/* View */}
            <Link
                href={`/organization/locations/${locationId}`}
                className="text-sm font-medium text-[#FE5720] hover:underline"
            >
                View
            </Link>

            {/* Copy */}
            <Button
                type="button"
                variant="neutral"
                onClick={onCopy}
                className="h-8 w-8 p-0"
                title="Copy"
            >
                <Copy className="h-4 w-4" />
            </Button>

            {/* More */}
            <div className="relative">
                <details className="group">
                    <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md hover:bg-gray-100">
                        <MoreVertical className="h-4 w-4 text-gray-600" />
                    </summary>

                    <div className="absolute right-0 top-9 z-20 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                        {/* Edit */}
                        <button
                            type="button"
                            disabled={!isActive}
                            onClick={onEdit}
                            className={[
                                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                                isActive
                                    ? "text-gray-700 hover:bg-gray-50"
                                    : "cursor-not-allowed text-gray-300",
                            ].join(" ")}
                        >
                            <Edit className="h-4 w-4" />
                            Edit
                        </button>

                        {/* Activate / Deactivate */}
                        <button
                            type="button"
                            onClick={onToggleStatus}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <Power className="h-4 w-4" />

                            {isActive ? "Deactivate" : "Activate"}
                        </button>
                    </div>
                </details>
            </div>
        </div>
    );
}