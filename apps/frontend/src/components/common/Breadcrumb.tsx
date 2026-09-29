"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    showHome?: boolean;
}

export default function Breadcrumb({
    items,
    showHome = true,
}: BreadcrumbProps) {
    return (
        <nav aria-label="Breadcrumb" className="flex items-center">
            <ol className="flex items-center gap-1 text-sm">
                {showHome && (
                    <>
                        <li>
                            <Link
                                href="/"
                                className="flex items-center text-gray-500 transition-colors hover:text-gray-900"
                            >
                                <Home className="h-4 w-4" />
                            </Link>
                        </li>

                        {items.length > 0 && (
                            <li>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                            </li>
                        )}
                    </>
                )}

                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <li key={`${item.label}-${index}`} className="flex items-center">
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className="text-gray-500 transition-colors hover:text-gray-900"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    className={
                                        isLast
                                            ? "font-medium text-gray-900"
                                            : "text-gray-500"
                                    }
                                >
                                    {item.label}
                                </span>
                            )}

                            {!isLast && (
                                <ChevronRight className="mx-1 h-4 w-4 text-gray-400" />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
} 