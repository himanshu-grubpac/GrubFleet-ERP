"use client";

import React, { type ReactNode } from "react";
import { FaCopy } from "react-icons/fa";
import { Edit, Power } from "lucide-react";
import Link from "next/link";

import { MoreVertical } from "lucide-react";

import {
    DashboardRowActionsMenu,
    DashboardRowActionsMenuItem,
} from "./DashboardRowActionsMenu";
import { dashboardRowMenuTriggerClassName } from "./dashboard-row-icon-button";
import { copyDashboardRowText } from "./DashboardRowCopyButton";
import {
    showCopiedToClipboardToast,
    showCopyToClipboardErrorToast,
} from "@/lib/toast/show-toast";

import { organisationLocationDetailHref } from "@/lib/navigation/organisation-static-routes";
import {
    prepareEntityNavigationForPath,
    pathnameFromHref,
    type EntityNavigationLabelOptions,
} from "@/lib/navigation/secure-entity-navigation";

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

/**
 * Shared list row actions: View link, Copy, optional ⋮ overflow (Edit / lifecycle / extras).
 *
 * **Overflow column policy (rule 37):**
 * - {@link hideOverflowMenu} — read-only lists where **no row** ever has overflow (Stock Balance, Parts Requests): View + Copy only.
 * - Default (disabled ⋮ when empty) — lists where **some rows** have menu items and others need a gray ⋮ for column alignment (org, Stock Receipt/Register, etc.).
 */
type DashboardTableActionsProps = {
    status: "active" | "inactive";
    locationId?: string;
    /** Entity id for secure navigation when opening View (defaults to locationId). */
    navigationEntityId?: string;
    /** Optional breadcrumb label priming (e.g. lease contract number). */
    navigationDisplayLabel?: string;
    navigationLabelOptions?: EntityNavigationLabelOptions;
    copyText?: string;
    viewHref?: string;
    allowEditWhenInactive?: boolean;
    hideEdit?: boolean;
    alwaysShowOverflowMenu?: boolean;
    /**
     * Omit ⋮ entirely (not even disabled). Use on read-only lists with no lifecycle or row overflow actions.
     */
    hideOverflowMenu?: boolean;
    /** Gray non-clickable ⋮ when this row has no menu items but the table needs ⋮ column alignment. */
    overflowMenuDisabled?: boolean;
    onEdit?: () => void;
    onToggleStatus?: () => void;
    renderAdditionalMenuItems?: () => ReactNode;
};

export default function DashboardTableActions({
    status,
    locationId,
    navigationEntityId,
    navigationDisplayLabel,
    navigationLabelOptions,
    copyText,
    viewHref,
    allowEditWhenInactive = false,
    hideEdit = false,
    alwaysShowOverflowMenu = false,
    hideOverflowMenu = false,
    overflowMenuDisabled = false,
    onEdit,
    onToggleStatus,
    renderAdditionalMenuItems,
}: DashboardTableActionsProps) {
    /** @deprecated No-op — use `hideOverflowMenu` or `overflowMenuDisabled` instead. */
    void alwaysShowOverflowMenu;

    const isActive = status === "active";

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

    const entityIdForViewNavigation =
        navigationEntityId?.trim() || locationId?.trim() || "";

    const handleViewNavigate = () => {
        if (!entityIdForViewNavigation || resolvedViewHref === "#") {
            return;
        }
        prepareEntityNavigationForPath(
            pathnameFromHref(resolvedViewHref),
            entityIdForViewNavigation,
            navigationLabelOptions ??
                (navigationDisplayLabel?.trim()
                    ? {
                          displayLabel: navigationDisplayLabel.trim(),
                          labelKind: "lease",
                      }
                    : undefined),
        );
    };

    /**
     * Copy row data and display success feedback.
     */
    const handleCopy = async () => {
        const text = copyText?.trim() || locationId?.trim() || "";

        if (!text) {
            return;
        }

        const success = await copyDashboardRowText(text);

        if (success) {
            showCopiedToClipboardToast();
            return;
        }

        showCopyToClipboardErrorToast();
    };

    const hasActionableOverflowItems =
        showEdit ||
        hasAdditionalMenuItems ||
        !!onToggleStatus;

    const showActiveOverflowMenu =
        !overflowMenuDisabled && hasActionableOverflowItems;

    const showOverflowColumn = !hideOverflowMenu;

    return (
        <div className="flex shrink-0 items-center justify-end gap-3 whitespace-nowrap">
            {/* View */}
            <Link
                href={resolvedViewHref}
                onClick={handleViewNavigate}
                className="shrink-0 text-sm font-medium text-[#FE5720] hover:underline"
            >
                View
            </Link>
            <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!copyText?.trim() && !locationId}
                aria-label="Copy row"
                title="Copy row details"
                className="
            inline-flex h-8 shrink-0 items-center justify-center gap-1.5
            whitespace-nowrap rounded-md px-1.5 text-sm font-medium
            text-gray-500 transition-[color,background-color] duration-150
            hover:bg-gray-100 hover:text-gray-900
            disabled:cursor-not-allowed disabled:opacity-40
        "
            >
                <span>Copy</span>
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-base leading-none text-[#FE5720]/40">
                    <FaCopy />
                </span>
            </button>


            {showOverflowColumn ? (
                showActiveOverflowMenu ? (
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
                ) : (
                    <button
                        type="button"
                        disabled
                        aria-label="Row actions unavailable"
                        title="No actions available"
                        className={`${dashboardRowMenuTriggerClassName} cursor-not-allowed text-gray-400 opacity-40`}
                    >
                        <MoreVertical
                            className="h-4 w-4"
                            strokeWidth={1.75}
                        />
                    </button>
                )
            ) : null}
        </div>
    );
}