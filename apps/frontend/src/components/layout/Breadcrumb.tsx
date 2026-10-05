

"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { BreadcrumbItem } from "@/config/breadcrumb-config";

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumb({
    items,
}: BreadcrumbProps) {
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

                    return (
                        <li
                            key={`${item.label}-${index}`}
                            className="flex min-w-0 items-center gap-1.5"
                        >
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
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