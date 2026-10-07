"use client";

import React, { type ReactNode } from "react";

/** Empty `<></>` from renderAdditionalMenuItems is truthy — must not open an empty ⋮ menu. */
function reactNodeHasRenderableContent(node: ReactNode): boolean {
    if (node == null || node === false) {
        return false;
    }
    if (Array.isArray(node)) {
        return node.some(reactNodeHasRenderableContent);
    }
    if (React.isValidElement(node)) {
        if (node.type === React.Fragment) {
            const fragmentProps = node.props as { children?: ReactNode };
            return reactNodeHasRenderableContent(fragmentProps.children);
        }
        return true;
    }
    if (typeof node === "string") {
        return node.trim().length > 0;
    }
    return true;
}
import {
    Copy,
    Edit,
    Power,
} from "lucide-react";
import Link from "next/link";
import {
    DashboardRowActionsMenu,
    DashboardRowActionsMenuItem,
} from "./DashboardRowActionsMenu";

type DashboardTableActionsProps = {
    status: "active" | "inactive";

    /**
     * Existing Location ID.
     * Kept for backward compatibility with Location pages.
     */
    locationId?: string;

    /** Row copy payload (display string). Falls back to locationId when omitted. */
    copyText?: string;

    /**
     * Optional custom View URL.
     * Use this for modules such as Suppliers, Employees, etc.
     */
    viewHref?: string;

    /**
     * Organisation default: Edit only when `status === "active"` (`31`).
     * Set true for modules that allow edit while inactive (e.g. lease contracts).
     */
    allowEditWhenInactive?: boolean;

    onEdit?: () => void;
    onToggleStatus?: () => void;

    /** Module-specific overflow entries (same menu panel as Edit / status toggle). */
    renderAdditionalMenuItems?: () => ReactNode;
};

export default function DashboardTableActions({
    status,
    locationId,
    copyText,
    viewHref,
    allowEditWhenInactive = false,
    onEdit,
    onToggleStatus,
    renderAdditionalMenuItems,
}: DashboardTableActionsProps) {
    const isActive = status === "active";
    const showEdit = onEdit && (isActive || allowEditWhenInactive);
    const additionalMenuItems = renderAdditionalMenuItems?.();
    const hasAdditionalMenuItems =
        reactNodeHasRenderableContent(additionalMenuItems);

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
        const text = copyText?.trim() || locationId;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Clipboard denied or unavailable — no-op
        }
    };

    const hasOverflowMenu =
        showEdit || hasAdditionalMenuItems || !!onToggleStatus;

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
                disabled={!copyText?.trim() && !locationId}
                aria-label="Copy row"
                title="Copy row"
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

            {/* More — portaled fixed menu (escapes table overflow-x-auto clip) */}
            {hasOverflowMenu ? (
                <DashboardRowActionsMenu ariaLabel="Row actions">
                    {({ close }) => (
                        <>
                            {showEdit ? (
                                <DashboardRowActionsMenuItem
                                    icon={<Edit className="h-4 w-4" />}
                                    label="Edit"
                                    onSelect={() => {
                                        close();
                                        onEdit?.();
                                    }}
                                />
                            ) : null}

                            {hasAdditionalMenuItems
                                ? additionalMenuItems
                                : null}

                            {onToggleStatus ? (
                                <DashboardRowActionsMenuItem
                                    icon={<Power className="h-4 w-4" />}
                                    label={isActive ? "Deactivate" : "Activate"}
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
