
"use client";

import { usePathname, useSearchParams } from "next/navigation";

import Breadcrumb from "./Breadcrumb";
import { resolveBreadcrumbs } from "@/lib/navigation/breadcrumb-resolver";
import { resolveFleetBreadcrumbs } from "@/lib/navigation/fleet-breadcrumb-resolver";
import { resolveOrganizationBreadcrumbs } from "@/lib/navigation/organization-breadcrumb-resolver";
import { resolveInventoryBreadcrumbs } from "@/lib/navigation/inventory-breadcrumb-resolver";
import { resolveFinanceBreadcrumbs } from "@/lib/navigation/finance-breadcrumb-resolver";
import { resolveAdministrationBreadcrumbs } from "@/lib/navigation/fleet-breadcrumb-resolver";
import { resolveWorkshopBreadcrumbs } from "@/lib/navigation/fleet-breadcrumb-resolver";

export default function ModuleSubHeader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const breadcrumbs = pathname.startsWith("/fleet-leasing")
        ? resolveFleetBreadcrumbs(pathname, searchParams)
        : pathname.startsWith("/inventory")
            ? resolveInventoryBreadcrumbs(pathname, searchParams)
            : pathname.startsWith("/organisation")
                ? resolveOrganizationBreadcrumbs(pathname, searchParams)
                : pathname.startsWith("/finance")
                    ? resolveFinanceBreadcrumbs(pathname, searchParams)
                    : pathname.startsWith("/administration")
                        ? resolveAdministrationBreadcrumbs(pathname)
                        : pathname.startsWith("/workshop")
                            ? (
                                resolveWorkshopBreadcrumbs(pathname).length > 0
                                    ? resolveWorkshopBreadcrumbs(pathname)
                                    : resolveBreadcrumbs(pathname, searchParams)
                            )
                            : resolveBreadcrumbs(pathname, searchParams);

    return (
        <div className="flex min-h-12 min-w-0 items-center px-4 py-3 md:px-6 bg-[#f8f8f8]">
            <div className="min-w-0">
                <Breadcrumb items={breadcrumbs} />
            </div>
        </div>
    );
}
