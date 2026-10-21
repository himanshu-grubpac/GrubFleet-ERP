"use client";

import type { ReactNode } from "react";

type OrganizationViewLayoutProps = {
    children: ReactNode;
};

/** Full-page read-only detail shell (matches organisation location/supplier view pages). */
export default function OrganizationViewLayout({
    children,
}: OrganizationViewLayoutProps) {
    return (
        <div className="w-full min-w-0 bg-[#f7f7f7]">
            <main className="px-4 py-3 pb-8 sm:px-6">{children}</main>
        </div>
    );
}
