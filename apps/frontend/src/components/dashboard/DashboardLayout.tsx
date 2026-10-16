
"use client";

import Link from "next/link";
import React from "react";

import { internalHref } from "@/lib/navigation/nav-path-match";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type DashboardTab = {
    label: string;
    href: string;
};

type DashboardPaginationProps = {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
};

type DashboardLayoutProps = {
    title: string;
    description?: string;
    descriptionBreakAfter?: string;
    tabs?: DashboardTab[];
    activeTab?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    pagination?: DashboardPaginationProps;
};

/* -------------------------------------------------------------------------- */
/* Dashboard Pagination                                                       */
/* -------------------------------------------------------------------------- */

function DashboardPagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
}: DashboardPaginationProps) {
    const safeTotalPages = Math.max(1, totalPages);

    const safeCurrentPage = Math.max(
        1,
        Math.min(currentPage, safeTotalPages),
    );

    const startItem =
        totalItems === 0
            ? 0
            : (safeCurrentPage - 1) * pageSize + 1;

    const endItem = Math.min(
        safeCurrentPage * pageSize,
        totalItems,
    );

    return (
        <div className="mt-3 flex items-center justify-between">
            {/* Showing Count */}
            <p className="text-xs text-gray-500">
                Showing {startItem}–{endItem} of {totalItems}
            </p>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
                {/* Previous */}
                <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() =>
                        onPageChange(
                            Math.max(1, safeCurrentPage - 1),
                        )
                    }
                    className="
                        h-8
                        rounded-md
                        border
                        border-gray-200
                        bg-white
                        px-3
                        text-xs
                        font-medium
                        text-gray-500
                        transition-colors
                        hover:bg-gray-50
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >
                    Prev
                </button>

                {/* Current Page */}
                <button
                    type="button"
                    aria-current="page"
                    className="
                        h-8
                        min-w-8
                        rounded-md
                        bg-[#FE5720]
                        px-2
                        text-xs
                        font-medium
                        text-white
                    "
                >
                    {safeCurrentPage}
                </button>

                {/* Next */}
                <button
                    type="button"
                    disabled={safeCurrentPage >= safeTotalPages}
                    onClick={() =>
                        onPageChange(
                            Math.min(
                                safeTotalPages,
                                safeCurrentPage + 1,
                            ),
                        )
                    }
                    className="
                        h-8
                        rounded-md
                        border
                        border-gray-200
                        bg-white
                        px-3
                        text-xs
                        font-medium
                        text-gray-500
                        transition-colors
                        hover:bg-gray-50
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >
                    Next
                </button>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Dashboard Layout                                                           */
/* -------------------------------------------------------------------------- */

export default function DashboardLayout({
    title,
    description,
    descriptionBreakAfter,
    tabs = [],
    activeTab,
    action,
    children,
    pagination,
}: DashboardLayoutProps) {
    const renderDescription = () => {
        if (!description) {
            return null;
        }

        if (
            !descriptionBreakAfter ||
            !description.includes(descriptionBreakAfter)
        ) {
            return description;
        }

        const breakIndex = description.indexOf(
            descriptionBreakAfter,
        );

        const firstLineEnd =
            breakIndex + descriptionBreakAfter.length;

        const firstLine = description.slice(0, firstLineEnd);
        const secondLine = description
            .slice(firstLineEnd)
            .trim();

        return (
            <>
                {firstLine}
                <br />
                {secondLine}
            </>
        );
    };

    return (
        <div className="flex min-h-full flex-col bg-[#f8f8f8]">
            {/* Header */}
            <div className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                    {/* Title + Description */}
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold text-gray-900">
                            {title}
                        </h1>

                        {description && (
                            <p className="mt-1 text-sm text-gray-500">
                                {renderDescription()}
                            </p>
                        )}
                    </div>

                    {/* Header Action */}
                    {action && (
                        <div className="shrink-0">
                            {action}
                        </div>
                    )}
                </div>

                {/* Sub Navigation */}
                {tabs.length > 0 && (
                    <nav className="mt-5 flex gap-6">
                        {tabs.map((tab) => {
                            const isActive =
                                activeTab === tab.href;

                            return (
                                <Link
                                    key={tab.href}
                                    href={internalHref(tab.href)}
                                    className={[
                                        "border-b-2 pb-3 text-sm font-medium transition-colors",
                                        isActive
                                            ? "border-[#FE5720] text-[#FE5720]"
                                            : "border-transparent text-gray-500 hover:text-gray-900",
                                    ].join(" ")}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>

            {/* Content */}
            <main className="flex-1 p-6">
                {children}

                {/* Common Pagination */}
                {pagination && pagination.totalItems > 0 && (
                    <DashboardPagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.totalItems}
                        pageSize={pagination.pageSize}
                        onPageChange={pagination.onPageChange}
                    />
                )}
            </main>
        </div>
    );
}
