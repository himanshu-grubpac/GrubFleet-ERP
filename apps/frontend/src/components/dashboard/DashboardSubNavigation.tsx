"use client";

import Link from "next/link";

export type DashboardSubNavItem = {
    label: string;
    href: string;
};

type DashboardSubNavigationProps = {
    items: DashboardSubNavItem[];
    activeHref: string;
};

export default function DashboardSubNavigation({
    items,
    activeHref,
}: DashboardSubNavigationProps) {
    if (!items.length) {
        return null;
    }

    return (
        <nav className="mt-5 flex items-center gap-6 border-b border-gray-200">
            {items.map((item) => {
                const isActive = item.href === activeHref;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={[
                            "border-b-2 pb-3 text-sm font-medium transition-colors",
                            isActive
                                ? "border-[#FE5720] text-[#FE5720]"
                                : "border-transparent text-gray-500 hover:text-gray-900",
                        ].join(" ")}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}