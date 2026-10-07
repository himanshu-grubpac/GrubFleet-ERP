"use client";

import React from "react";
import {
    Copy,
    Edit,
    MoreVertical,
    Power,
} from "lucide-react";
import Link from "next/link";

type DashboardTableActionsProps = {
    status: "active" | "inactive";

    /**
     * Existing Location ID.
     * Kept for backward compatibility with Location pages.
     */
    locationId?: string;

    /**
     * Optional custom View URL.
     * Use this for modules such as Suppliers, Employees, etc.
     */
    viewHref?: string;

    /**
     * Hide the Edit action from the More menu.
     * Useful for dashboards where editing is not allowed.
     */
    hideEdit?: boolean;

    onEdit?: () => void;
    onToggleStatus: () => void;
};

export default function DashboardTableActions({
    status,
    locationId,
    viewHref,
    hideEdit = false,
    onEdit,
    onToggleStatus,
}: DashboardTableActionsProps) {
    const isActive = status === "active";

    /* ---------------------------------------------------------------------- */
    /* View URL                                                               */
    /* ---------------------------------------------------------------------- */

    const resolvedViewHref =
        viewHref ??
        (locationId
            ? `/organization/locations/${locationId}`
            : "#");

    /* ---------------------------------------------------------------------- */
    /* Copy                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleCopy = async () => {
        if (!locationId) return;

        try {
            await navigator.clipboard.writeText(locationId);

            console.log("Copied:", locationId);
        } catch (error) {
            console.error(
                "Failed to copy:",
                error
            );
        }
    };

    return (
        <div className="flex items-center justify-end gap-3">
            {/* View */}
            <Link
                href={resolvedViewHref}
                className="text-sm font-medium text-[#FE5720] hover:underline"
            >
                View
            </Link>

            {/* Copy Icon */}
            <button
                type="button"
                onClick={handleCopy}
                disabled={!locationId}
                aria-label="Copy ID"
                title="Copy ID"
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
                    disabled:cursor-not-allowed
                    disabled:opacity-40
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
                        {/* Edit */}
                        {!hideEdit && (
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
                        )}

                        {/* Activate / Deactivate */}
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
                    </div>
                </details>
            </div>
        </div>
    );
}