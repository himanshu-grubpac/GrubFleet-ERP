"use client";

import React, { useState, type ReactNode } from "react";
import { FaCopy } from "react-icons/fa";
import { Edit, Power } from "lucide-react";
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
    locationId?: string;
    copyText?: string;
    viewHref?: string;
    allowEditWhenInactive?: boolean;
    hideEdit?: boolean;
    alwaysShowOverflowMenu?: boolean;
    onEdit?: () => void;
    onToggleStatus?: () => void;
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

    const [copied, setCopied] = useState(false);

    const showEdit =
        !hideEdit &&
        !!onEdit &&
        (isActive || allowEditWhenInactive);

    const additionalMenuItems = renderAdditionalMenuItems?.();

    const hasAdditionalMenuItems =
        reactNodeHasRenderableContent(additionalMenuItems);

    const resolvedViewHref =
        viewHref ??
        (locationId
            ? organisationLocationDetailHref(locationId)
            : "#");

    /**
     * Copy row data and display success feedback.
     */
    const handleCopy = async () => {
        const text = copyText?.trim() || locationId;

        if (!text) {
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch {
            setCopied(false);
        }
    };

    const hasOverflowMenu =
        alwaysShowOverflowMenu ||
        showEdit ||
        hasAdditionalMenuItems ||
        !!onToggleStatus;

    return (
        <div className="flex shrink-0 items-center justify-end gap-3 whitespace-nowrap">
            {/* View */}
            <Link
                href={resolvedViewHref}
                className="shrink-0 text-sm font-medium text-[#FE5720] hover:underline"
            >
                View
            </Link>

            {/* Copy text and icon */}
            <button
                type="button"
                onClick={handleCopy}
                disabled={!copyText?.trim() && !locationId}
                aria-label={copied ? "Copied!" : "Copy row"}
                title={copied ? "Copied!" : "Copy row"}
                className="
                    inline-flex h-8 shrink-0 items-center justify-center gap-1.5
                    whitespace-nowrap rounded-md px-1.5 text-sm font-medium
                    text-gray-500 transition-colors
                    hover:bg-gray-100 hover:text-gray-900
                    disabled:cursor-not-allowed disabled:opacity-40
                "
            >
                <span>{copied ? "Copied!" : "Copy"}</span>
                <span className="text-[#FE5720]/40 text-base leading-none">
                    <FaCopy />
                </span>
            </button>

            {/* Three-dot actions menu */}
            {hasOverflowMenu ? (
                <DashboardRowActionsMenu ariaLabel="Row actions">
                    {({ close }) => (
                        <>
                            {/* Edit */}
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

                            {/* Additional module-specific actions */}
                            {hasAdditionalMenuItems
                                ? additionalMenuItems
                                : null}

                            {/* Activate / Deactivate */}
                            {onToggleStatus ? (
                                <DashboardRowActionsMenuItem
                                    icon={<Power className="h-4 w-4" />}
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