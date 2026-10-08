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
    tabs?: DashboardTab[];
    activeTab?: string;
    action?: React.ReactNode;
    children: React.ReactNode;

    /**
     * Optional pagination.
     *
     * Pass this from dashboards that contain paginated
     * table data. Dashboards without pagination can
     * simply omit this prop.
     */
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
    /* ---------------------------------------------------------------------- */
    /* Safe Pagination Values                                                 */
    /* ---------------------------------------------------------------------- */

    const safeTotalPages = Math.max(
        1,
        totalPages,
    );

    const safeCurrentPage = Math.max(
        1,
        Math.min(
            currentPage,
            safeTotalPages,
        ),
    );

    /* ---------------------------------------------------------------------- */
    /* Showing Count                                                          */
    /* ---------------------------------------------------------------------- */

    const startItem =
        totalItems === 0
            ? 0
            : (safeCurrentPage - 1) *
            pageSize +
            1;

    const endItem = Math.min(
        safeCurrentPage * pageSize,
        totalItems,
    );

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="mt-3 flex items-center justify-between">
            {/* ========================================================== */}
            {/* Showing Count                                               */}
            {/* ========================================================== */}

            <p className="text-xs text-gray-500">
                Showing {startItem}–{endItem} of{" "}
                {totalItems}
            </p>

            {/* ========================================================== */}
            {/* Pagination Controls                                         */}
            {/* ========================================================== */}

            <div className="flex items-center gap-1.5">
                {/* Previous */}

                <button
                    type="button"
                    disabled={
                        safeCurrentPage === 1
                    }
                    onClick={() =>
                        onPageChange(
                            Math.max(
                                1,
                                safeCurrentPage - 1,
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
                    Prev
                </button>

                {/* Current Page */}

                <button
                    type="button"
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
                    disabled={
                        safeCurrentPage >=
                        safeTotalPages
                    }
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
    tabs = [],
    activeTab,
    action,
    children,
    pagination,
}: DashboardLayoutProps) {
    return (
        <div className="flex min-h-full flex-col bg-[#f8f8f8]">
            {/* ========================================================== */}
            {/* Header                                                      */}
            {/* ========================================================== */}
            <div className=" px-6 py-5">
                <div className="flex items-start justify-between">
                    {/* Title + Description */}

                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            {title}
                        </h1>

                        {description && (
                            <p className="mt-1 text-sm text-gray-500">
                                {description}
                            </p>
                        )}
                    </div>

                    {/* Header Action */}

                    {action && (
                        <div>
                            {action}
                        </div>
                    )}
                </div>

                {/* ====================================================== */}
                {/* Sub Navigation                                          */}
                {/* ====================================================== */}

                {tabs.length > 0 && (
                    <nav className="mt-5 flex gap-6">
                        {tabs.map((tab) => {
                            const isActive =
                                activeTab ===
                                tab.href;

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

            {/* ========================================================== */}
            {/* Content                                                     */}
            {/* ========================================================== */}

            <main className="flex-1 p-6">
                {children}

                {/* ====================================================== */}
                {/* Common Pagination                                       */}
                {/* ====================================================== */}

                {pagination && (
                    <DashboardPagination
                        currentPage={
                            pagination.currentPage
                        }
                        totalPages={
                            pagination.totalPages
                        }
                        totalItems={
                            pagination.totalItems
                        }
                        pageSize={
                            pagination.pageSize
                        }
                        onPageChange={
                            pagination.onPageChange
                        }
                    />
                )}
            </main>
        </div>
    );
}