
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
            <ol className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <li
                            key={`${item.label}-${index}`}
                            className="flex min-w-0 shrink items-center gap-1.5"
                        >
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className="min-w-0 truncate text-slate-400 transition-colors hover:text-[#FE5720]"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    aria-current={isLast ? "page" : undefined}
                                    className={
                                        isLast
                                            ? "min-w-0 truncate font-medium text-slate-900"
                                            : "min-w-0 truncate text-slate-400"
                                    }
                                >
                                    {item.label}
                                </span>
                            )}

                            {!isLast && (
                                <ChevronRight
                                    aria-hidden="true"
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
