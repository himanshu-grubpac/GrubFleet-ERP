"use client";

import type { ReactNode } from "react";

type OrganizationDetailCardProps = {
    children: ReactNode;
    className?: string;
};

/** White bordered card wrapper for view/detail field grids. */
export default function OrganizationDetailCard({
    children,
    className = "",
}: OrganizationDetailCardProps) {
    return (
        <div
            className={`rounded-lg border border-gray-200 bg-white p-5 ${className}`.trim()}
        >
            {children}
        </div>
    );
}

/** Standard responsive grid for `DetailField` rows inside `OrganizationDetailCard`. */
export function OrganizationDetailFieldGrid({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {children}
        </dl>
    );
}
