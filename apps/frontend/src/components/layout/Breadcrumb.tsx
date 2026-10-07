

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import type { DashboardBreadcrumbItem } from "@/lib/navigation/dashboard-breadcrumbs";
import {
    internalHref,
    normalizeNavPath,
} from "@/lib/navigation/nav-path-match";

interface BreadcrumbProps {
    items: DashboardBreadcrumbItem[];
}

export default function Breadcrumb({
    items,
}: BreadcrumbProps) {
    const pathname = normalizeNavPath(usePathname() ?? "/");

    if (!items.length) {
        return null;
    }

    return (
        <nav
            aria-label="Breadcrumb"
            className="min-w-0"
        >
            <ol className="flex items-center gap-1.5 text-xs">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const linkTarget = item.href
                        ? internalHref(item.href)
                        : undefined;
                    const normalizedTarget = linkTarget
                        ? normalizeNavPath(linkTarget)
                        : null;
                    const showLink =
                        normalizedTarget != null &&
                        normalizedTarget !== pathname;

                    return (
                        <li
                            key={`${item.label}-${index}`}
                            className="flex min-w-0 items-center gap-1.5"
                        >
                            {showLink && linkTarget ? (
                                <Link
                                    href={linkTarget}
                                    className="truncate text-slate-400 transition-colors hover:text-slate-700"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    className={
                                        isLast
                                            ? "truncate font-medium text-slate-900"
                                            : "truncate text-slate-400"
                                    }
                                >
                                    {item.label}
                                </span>
                            )}

                            {!isLast && (
                                <ChevronRight
                                    className="h-3 w-3 shrink-0 text-slate-300"
                                    strokeWidth={1.8}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}