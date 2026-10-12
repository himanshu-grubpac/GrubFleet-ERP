"use client";

import React, { type ReactNode } from "react";
import { Copy, Edit, Power } from "lucide-react";
import Link from "next/link";

import {
    DashboardRowActionsMenu,
    DashboardRowActionsMenuItem,
} from "./DashboardRowActionsMenu";

import { organisationLocationDetailHref } from "@/lib/navigation/organisation-static-routes";

/**
 * Prevent empty fragments from opening an empty three-dot menu.
 */
function reactNodeHasRenderableContent(node: ReactNode): boolean {
    if (node == null || typeof node === "boolean") {
        return false;
    }

    if (Array.isArray(node)) {
        return node.some(reactNodeHasRenderableContent);
    }

    if (React.isValidElement(node)) {
        if (node.type === React.Fragment) {
            const fragmentProps = node.props as {
                children?: ReactNode;
            };

            return reactNodeHasRenderableContent(
                fragmentProps.children
            );
        }

        return true;
    }

    if (typeof node === "string") {
        return node.trim().length > 0;
    }

    return true;
}

type DashboardTableActionsProps = {
    status: "active" | "inactive";

    /**
     * Existing Location ID.
     * Kept for backward compatibility with Location pages.
     */
    locationId?: string;

    /** Row copy payload. Falls back to locationId when omitted. */
    copyText?: string;

    /**
     * Optional custom View URL.
     * Use this for Suppliers, Employees, Lease Contracts, etc.
     */
    viewHref?: string;

    /** Allow editing inactive records. */
    allowEditWhenInactive?: boolean;

    /** Hide the Edit action from the overflow menu. */
    hideEdit?: boolean;

    /**
     * Keep the three-dot menu visible even when there are no actions.
     */
    alwaysShowOverflowMenu?: boolean;

    onEdit?: () => void;
    onToggleStatus?: () => void;

    /** Module-specific overflow entries. */
    renderAdditionalMenuItems?: () => ReactNode;
};

export default function DashboardTableActions({
    status,
    locationId,
    copyText,
    viewHref,
    allowEditWhenInactive = false,
    hideEdit = false,
    alwaysShowOverflowMenu = false,
    onEdit,
    onToggleStatus,
    renderAdditionalMenuItems,
}: DashboardTableActionsProps) {
    const isActive = status === "active";

    const showEdit =
        !hideEdit &&
        !!onEdit &&
        (isActive || allowEditWhenInactive);

    const additionalMenuItems = renderAdditionalMenuItems?.();

    const hasAdditionalMenuItems =
        reactNodeHasRenderableContent(additionalMenuItems);

    /**
     * View URL
     */
    const resolvedViewHref =
        viewHref ??
        (locationId
            ? organisationLocationDetailHref(locationId)
            : "#");

    /**
     * Copy row data
     */
    const handleCopy = async () => {
        const text = copyText?.trim() || locationId;

        if (!text) {
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Clipboard unavailable or permission denied.
        }
    };

    /**
     * Show the three-dot menu when it contains actions,
     * or when alwaysShowOverflowMenu is enabled.
     */
    const hasOverflowMenu =
        alwaysShowOverflowMenu ||
        showEdit ||
        hasAdditionalMenuItems ||
        !!onToggleStatus;

    return (
        <div className="flex items-center justify-end gap-3">
            {/* View */}
            <Link
                href={resolvedViewHref}
                className="text-sm font-medium text-[#FE5720] hover:underline"
            >
                View
            </Link>

            {/* Copy */}
            <button
                type="button"
                onClick={handleCopy}
                disabled={!copyText?.trim() && !locationId}
                aria-label="Copy row"
                title="Copy row"
                className="
                    flex h-8 w-8 items-center justify-center
                    rounded-md text-gray-500 transition-colors
                    hover:bg-gray-100 hover:text-gray-900
                    disabled:cursor-not-allowed disabled:opacity-40
                "
            >
                <Copy
                    className="h-4 w-4"
                    strokeWidth={1.7}
                />
            </button>

            {/* Three-dot actions menu */}
            {hasOverflowMenu ? (
                <DashboardRowActionsMenu
                    ariaLabel="Row actions"
                >
                    {({ close }) => (
                        <>
                            {/* Edit */}
                            {showEdit ? (
                                <DashboardRowActionsMenuItem
                                    icon={
                                        <Edit className="h-4 w-4" />
                                    }
                                    label="Edit"
                                    onSelect={() => {
                                        close();
                                        onEdit?.();
                                    }}
                                />
                            ) : null}

                            {/* Additional module-specific actions */}
                            {hasAdditionalMenuItems
                                ? additionalMenuItems
                                : null}

                            {/* Activate / Deactivate */}
                            {onToggleStatus ? (
                                <DashboardRowActionsMenuItem
                                    icon={
                                        <Power className="h-4 w-4" />
                                    }
                                    label={
                                        isActive
                                            ? "Deactivate"
                                            : "Activate"
                                    }
                                    onSelect={() => {
                                        close();
                                        onToggleStatus();
                                    }}
                                />
                            ) : null}
                        </>
                    )}
                </DashboardRowActionsMenu>
            ) : null}
        </div>
    );
}
