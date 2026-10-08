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
        <div className="min-h-screen bg-[#f7f7f7]">
            <main className="px-6 py-3 pb-8">{children}</main>
        </div>
    );
}
