
import {
    breadcrumbConfig,
    type BreadcrumbItem,
} from "@/config/breadcrumb-config";

import {
    mainNavItems,
    type NavItem,
} from "@/lib/navigation/modules";

import {
    assetRegisterFleetDetailHref,
} from "@/lib/navigation/asset-register-static-routes";

function normalizePath(path: string): string {
    const normalized = path.split("?")[0].replace(/\/+$/, "");
    return normalized || "/";
}

function normalizeHref(href: string): string {
    const queryIndex = href.indexOf("?");

    const pathname =
        queryIndex === -1 ? href : href.slice(0, queryIndex);

    const query =
        queryIndex === -1 ? "" : href.slice(queryIndex);

    return `${normalizePath(pathname)}${query}`;
}

const PAGE_LABELS: Record<string, string> = {
    create: "Create",
    edit: "Edit",
    detail: "View Details",
    new: "New",
    view: "View",
    "lease-history": "Lease History",
    purchase: "Purchase",
    sale: "Sale",
    billing: "Billing",
    schedule: "Schedule",
    record: "Record Payment",
    "vehicle-replacement": "Vehicle Replacement",
};

function formatSegment(segment: string): string {
    return (
        PAGE_LABELS[segment] ??
        segment
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (character) => character.toUpperCase())
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
    const path = normalizePath(pathname);
    let bestMatch: NavigationMatch | null = null;

    for (const item of items) {
        const href = normalizePath(item.href);

        const matches =
            path === href ||
            (href !== "/" && path.startsWith(`${href}/`));

        if (matches) {
            const match: NavigationMatch = {
                item,
                ancestors,
                href,
            };

            if (!bestMatch || href.length > bestMatch.href.length) {
                bestMatch = match;
            }
        }

        if (item.children?.length) {
            const childMatch = findNavigationMatch(
                item.children,
                path,
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

function getConfiguredBreadcrumbs(
    path: string,
): BreadcrumbItem[] | null {
    const entry = Object.entries(breadcrumbConfig).find(
        ([route]) => normalizePath(route) === path,
    );

    if (!entry) {
        return null;
    }

    return entry[1].map((item) => ({
        ...item,
        href: item.href ? normalizeHref(item.href) : undefined,
    }));
}

function getLeaseHistoryBreadcrumbs(
    searchParams: URLSearchParams,
): BreadcrumbItem[] {
    const vehicleId = searchParams.get("vehicleId") ?? "";

    return [
        {
            label: "Asset Management",
            href: "/asset-register/",
        },
        {
            label: "Fleet Register",
            href: "/asset-register/fleetregister/",
        },
        {
            label: "View Vehicle",
            href: vehicleId.trim()
                ? assetRegisterFleetDetailHref(vehicleId)
                : "/asset-register/fleetregister/",
        },
        {
            label: "Lease History",
        },
    ];
}

function getNavigationBreadcrumbs(
    path: string,
): BreadcrumbItem[] {
    const match = findNavigationMatch(mainNavItems, path);

    if (!match) {
        return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [
        ...match.ancestors.map((item) => ({
            label: item.label,
            href: normalizeHref(item.href),
        })),
        {
            label: match.item.label,
        },
    ];

    const remainingPath =
        path === match.href ? "" : path.slice(match.href.length);

    const segments = remainingPath.split("/").filter(Boolean);
    let currentPath = match.href;

    segments.forEach((segment, index) => {
        currentPath = `${currentPath}/${segment}`;

        breadcrumbs.push({
            label: formatSegment(segment),
            href:
                index < segments.length - 1
                    ? currentPath
                    : undefined,
        });
    });

    return breadcrumbs;
}

export function resolveBreadcrumbs(
    pathname: string,
    searchParams: URLSearchParams,
): BreadcrumbItem[] {
    const path = normalizePath(pathname);

    // Lease history has its own breadcrumb hierarchy.
    if (
        path ===
        "/asset-register/fleetregister/detail/lease-history"
    ) {
        return getLeaseHistoryBreadcrumbs(searchParams);
    }

    // Asset Assignment: override generic "View Details".
    if (path === "/asset-register/asset-assign/detail") {
        return [
            {
                label: "Asset Management",
                href: "/asset-register/",
            },
            {
                label: "Asset Assignment",
                href: "/asset-register/asset-assign/",
            },
            {
                label: "Assign",
            },
        ];
    }

    if (path === "/asset-register/asset-assign/bulk") {
        return [
            {
                label: "Asset Management",
                href: "/asset-register/",
            },
            {
                label: "Asset Assignment",
                href: "/asset-register/asset-assign/",
            },
            {
                label: "Bulk assign",
            },
        ];
    }

    // Compliance & Renewals: override generic "View Details".
    if (path === "/asset-register/compliance-renewals/detail") {
        return [
            {
                label: "Asset Management",
                href: "/asset-register/",
            },
            {
                label: "Compliance & Renewals",
                href: "/asset-register/compliance-renewals/",
            },
            {
                label: "Renew",
            },
        ];
    }

    // Explicit configuration takes precedence for all other routes.
    const configuredBreadcrumbs = getConfiguredBreadcrumbs(path);

    if (configuredBreadcrumbs) {
        return configuredBreadcrumbs;
    }

    // Fall back to the sidebar navigation tree.
    return getNavigationBreadcrumbs(path);
}
