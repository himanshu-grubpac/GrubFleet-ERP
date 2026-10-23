
import type { BreadcrumbItem } from "@/config/breadcrumb-config";

function normalizePath(path: string): string {
    const normalized = path.split("?")[0].replace(/\/+$/, "");
    return normalized || "/";
}

const ORGANIZATION_ROUTES = [
    {
        path: "/organisation/clients",
        label: "Clients",
    },
    {
        path: "/organisation/driver-register",
        label: "Driver Register",
    },
    {
        path: "/organisation/employees",
        label: "Employees",
    },
    {
        path: "/organisation/locations",
        label: "Locations",
    },
    {
        path: "/organisation/suppliers",
        label: "Suppliers",
    },
    {
        path: "/organisation/asset-classes",
        label: "Asset Classes",
    },
    {
        path: "/organisation/fleet-register",
        label: "Fleet Register",
    },
    {
        path: "/organisation/asset-assignment",
        label: "Asset Assignment",
    },
    {
        path: "/organisation/compliance-renewals",
        label: "Compliance & Renewals",
    },
];

function getPageLabel(segment: string): string {
    const labels: Record<string, string> = {
        create: "Create",
        new: "New",
        edit: "Edit",
        detail: "View Details",
        view: "View Details",
        "add-driver": "Add Driver",
    };

    return (
        labels[segment] ??
        segment.replace(/[-_]/g, " ").replace(/\b\w/g, (char) =>
            char.toUpperCase(),
        )
    );
}

export function resolveOrganizationBreadcrumbs(
    pathname: string,
    _searchParams: URLSearchParams,
): BreadcrumbItem[] {
    const path = normalizePath(pathname);

    if (path === "/organisation") {
        return [{ label: "Organisation" }];
    }

    const route = ORGANIZATION_ROUTES
        .filter((item) => path === item.path || path.startsWith(`${item.path}/`))
        .sort((a, b) => b.path.length - a.path.length)[0];

    if (!route) {
        return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: route.label,
            href: route.path,
        },
    ];

    const remainingPath = path.slice(route.path.length);
    const segments = remainingPath.split("/").filter(Boolean);

    // A route with no additional segments is the current page.
    if (segments.length === 0) {
        breadcrumbs[breadcrumbs.length - 1] = {
            label: route.label,
        };

        return breadcrumbs;
    }

    let currentPath = route.path;

    segments.forEach((segment, index) => {
        currentPath += `/${segment}`;

        breadcrumbs.push({
            label: getPageLabel(segment),
            href:
                index < segments.length - 1
                    ? currentPath
                    : undefined,
        });
    });

    return breadcrumbs;
}