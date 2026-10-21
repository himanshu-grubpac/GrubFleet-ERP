import type { BreadcrumbItem } from "@/config/breadcrumb-config";
import { mainNavItems, type NavItem } from "@/lib/navigation/modules";
import {
    fleetLeaseContractDetailHref,
    fleetLeaseContractChangeHistoryHref,
    fleetLeaseContractEditHref,
} from "@/lib/navigation/fleet-static-routes";

function normalizePath(path: string): string {
    const normalized = path.split("?")[0].replace(/\/+$/, "");
    return normalized || "/";
}

function normalizeHref(href: string): string {
    const [pathname, query] = href.split("?");
    const normalized = normalizePath(pathname);
    return query ? `${normalized}?${query}` : normalized;
}

const PAGE_LABELS: Record<string, string> = {
    create: "New",
    new: "New",
    edit: "Edit",
    detail: "View Details",
    view: "View",
    "change-history": "Change History",
    renew: "Renew",
    extend: "Extend",
    "return-inspection": "Return Inspection",
    "returns-inspections": "Returns & Inspections",
    "renewals-extensions": "Renewals & Extensions",
    "lease-contracts": "Lease Contracts",
    "vehicle-replacement": "Vehicle Replacement",
};

function formatSegment(segment: string): string {
    return (
        PAGE_LABELS[segment] ??
        segment.replace(/[-_]/g, " ").replace(/\b\w/g, (char) =>
            char.toUpperCase(),
        )
    );
}

interface NavigationMatch {
    item: NavItem;
    ancestors: NavItem[];
    href: string;
}

function findNavigationMatch(
    items: NavItem[],
    pathname: string,
    ancestors: NavItem[] = [],
): NavigationMatch | null {
    let bestMatch: NavigationMatch | null = null;

    for (const item of items) {
        const href = normalizePath(item.href);
        const matches =
            pathname === href ||
            (href !== "/" && pathname.startsWith(`${href}/`));

        if (matches && (!bestMatch || href.length > bestMatch.href.length)) {
            bestMatch = { item, ancestors, href };
        }

        if (item.children?.length) {
            const childMatch = findNavigationMatch(
                item.children,
                pathname,
                [...ancestors, item],
            );

            if (
                childMatch &&
                (!bestMatch || childMatch.href.length > bestMatch.href.length)
            ) {
                bestMatch = childMatch;
            }
        }
    }

    return bestMatch;
}


function getFleetNavigationBreadcrumbs(path: string): BreadcrumbItem[] {
    const fleetItem = mainNavItems.find(
        (item) => normalizePath(item.href) === "/fleet-leasing",
    );

    if (!fleetItem) return [];

    // Explicit handling for Renew and Extend pages.
    const renewalsPath = "/fleet-leasing/renewals-extensions";

    if (
        path === `${renewalsPath}/renew` ||
        path === `${renewalsPath}/extend`
    ) {
        const page = path.endsWith("/renew") ? "Renew" : "Extend";

        return [
            {
                label: "Fleet & Leasing",
                href: "/fleet-leasing/",
            },
            {
                label: "Renewals & Extensions",
                href: `${renewalsPath}/`,
            },
            {
                label: page,
            },
        ];
    }

    const match = findNavigationMatch([fleetItem], path);
    if (!match) return [];

    const breadcrumbs: BreadcrumbItem[] = [
        {
            label: "Fleet & Leasing",
            href: "/fleet-leasing/",
        },
    ];

    // Add parent navigation items, excluding Fleet & Leasing.
    for (const ancestor of match.ancestors.slice(1)) {
        breadcrumbs.push({
            label: ancestor.label,
            href: normalizeHref(ancestor.href),
        });
    }

    // Add the matched navigation item.
    if (match.item !== fleetItem) {
        breadcrumbs.push({
            label: match.item.label,
            href: match.href,
        });
    }

    let currentPath = match.href;
    const remainingPath =
        path === match.href ? "" : path.slice(match.href.length);

    const segments = remainingPath.split("/").filter(Boolean);

    segments.forEach((segment, index) => {
        currentPath = `${currentPath}/${segment}`;

        breadcrumbs.push({
            label: formatSegment(segment),
            href:
                index < segments.length - 1
                    ? `${currentPath}/`
                    : undefined,
        });
    });

    return breadcrumbs;
}



export function resolveAdministrationBreadcrumbs(
    pathname: string,
): BreadcrumbItem[] {
    const path = normalizePath(pathname);

    if (path === "/administration") {
        return [{ label: "Administration" }];
    }

    if (path === "/administration/roles") {
        return [
            {
                label: "Administration",
                href: "/administration/",
            },
            {
                label: "Roles & Permissions",
            },
        ];
    }

    if (
        path === "/administration/roles/create" ||
        path === "/administration/roles/new"
    ) {
        return [
            {
                label: "Administration",
                href: "/administration/",
            },
            {
                label: "Roles & Permissions",
                href: "/administration/roles/",
            },
            {
                label: "New",
            },
        ];
    }

    return [];
}

export function resolveFleetBreadcrumbs(
    pathname: string,
    searchParams: URLSearchParams,
): BreadcrumbItem[] {
    const path = normalizePath(pathname);
    const leaseId = searchParams.get("leaseId");

    // Contract details
    if (path.endsWith("/lease-contracts/detail")) {
        return [
            { label: "Fleet & Leasing", href: "/fleet-leasing" },
            {
                label: "Lease Contracts",
                href: "/fleet-leasing/lease-contracts",
            },
            { label: "View Details" },
        ];
    }

    // Contract change history
    if (path.endsWith("/lease-contracts/detail/change-history")) {
        return [
            { label: "Fleet & Leasing", href: "/fleet-leasing" },
            {
                label: "Lease Contracts",
                href: "/fleet-leasing/lease-contracts",
            },
            {
                label: "View Details",
                href: leaseId
                    ? fleetLeaseContractDetailHref(leaseId)
                    : "/fleet-leasing/lease-contracts",
            },
            { label: "Change History" },
        ];
    }

    // Contract edit
    if (path.endsWith("/lease-contracts/detail/edit")) {
        return [
            { label: "Fleet & Leasing", href: "/fleet-leasing" },
            {
                label: "Lease Contracts",
                href: "/fleet-leasing/lease-contracts",
            },
            {
                label: "View Details",
                href: leaseId
                    ? fleetLeaseContractDetailHref(leaseId)
                    : "/fleet-leasing/lease-contracts",
            },
            { label: "Edit" },
        ];
    }

    return getFleetNavigationBreadcrumbs(path);
}
