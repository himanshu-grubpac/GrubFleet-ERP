import type { BreadcrumbItem } from "@/config/breadcrumb-config";
import { mainNavItems, type NavItem } from "@/lib/navigation/modules";
import {
    financeInvoiceDetailHref,
    financeInvoicesListHref,
    financeClientStatementsListHref,
} from "@/lib/navigation/finance-static-routes";

function normalizePath(path: string): string {
    const normalized = path.split("?")[0].replace(/\/+$/, "");
    return normalized || "/";
}

function normalizeHref(href: string): string {
    return normalizePath(href);
}

function formatSegment(segment: string): string {
    const labels: Record<string, string> = {
        create: "Create",
        new: "New",
        edit: "Edit",
        detail: "View Details",
        view: "View",
        history: "History",
        schedule: "Schedule",
        billing: "Billing",
        purchase: "Purchase",
        sale: "Sale",
        record: "Record Payment",
        "client-statements": "Client Statements",
        "vendor-payments": "Vendor Payments",
        invoices: "Invoices",
        "record-payment": "Record Payment",
    };

    return (
        labels[segment] ??
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

export function resolveFinanceBreadcrumbs(
    pathname: string,
    searchParams: URLSearchParams,
): BreadcrumbItem[] {
    const path = normalizePath(pathname);

    const financeItem = mainNavItems.find(
        (item) => normalizePath(item.href) === "/finance",
    );

    if (!financeItem) return [];

    const invoiceId = searchParams.get("invoiceId");

    // Finance dashboard
    if (path === "/finance") {
        return [{ label: financeItem.label }];
    }

    // Invoice list
    if (path === "/finance/invoices") {
        return [
            { label: financeItem.label, href: "/finance" },
            { label: "Invoices" },
        ];
    }

    // New invoice pages
    if (
        path === "/finance/invoices/new" ||
        path === "/finance/invoices/new/purchase" ||
        path === "/finance/invoices/new/sale" ||
        path === "/finance/invoices/new/billing"
    ) {
        return [
            { label: financeItem.label, href: "/finance" },
            {
                label: "Invoices",
                href: financeInvoicesListHref,
            },
            {
                label: "New",
            },
        ];
    }

    // Invoice detail
    if (path === "/finance/invoices/detail") {
        return [
            { label: financeItem.label, href: "/finance" },
            {
                label: "Invoices",
                href: financeInvoicesListHref,
            },
            { label: "View Details" },
        ];
    }

    // Record payment: preserve invoiceId in the View Details link.
    if (path === "/finance/invoices/detail/record-payment") {
        return [
            { label: financeItem.label, href: "/finance" },
            {
                label: "Invoices",
                href: financeInvoicesListHref,
            },
            {
                label: "View Details",
                href: invoiceId
                    ? financeInvoiceDetailHref(invoiceId)
                    : financeInvoicesListHref,
            },
            { label: "Record Payment" },
        ];
    }

    // Client Statements list and details
    if (path.startsWith("/finance/client-statements")) {
        const listPath = normalizePath(financeClientStatementsListHref);

        if (path === listPath) {
            return [
                { label: financeItem.label, href: "/finance" },
                { label: "Client Statements" },
            ];
        }

        if (
            path === "/finance/client-statements/detail" ||
            path.startsWith("/finance/client-statements/detail/")
        ) {
            return [
                { label: financeItem.label, href: "/finance" },
                {
                    label: "Client Statements",
                    href: financeClientStatementsListHref,
                },
                { label: "View Details" },
            ];
        }
    }

    // Vendor Payments
    if (path.startsWith("/finance/vendor-payments")) {
        if (path === "/finance/vendor-payments") {
            return [
                { label: financeItem.label, href: "/finance" },
                { label: "Vendor Payments" },
            ];
        }

        if (path === "/finance/vendor-payments/record") {
            return [
                { label: financeItem.label, href: "/finance" },
                {
                    label: "Vendor Payments",
                    href: "/finance/vendor-payments/",
                },
                { label: "Record Payment" },
            ];
        }

        if (path === "/finance/vendor-payments/detail") {
            return [
                { label: financeItem.label, href: "/finance" },
                {
                    label: "Vendor Payments",
                    href: "/finance/vendor-payments/",
                },
                { label: "View Details" },
            ];
        }
    }

    // Generic Finance navigation fallback
    const match = findNavigationMatch([financeItem], path);

    if (!match) return [];

    const breadcrumbs: BreadcrumbItem[] = [
        {
            label: financeItem.label,
            href: normalizeHref(financeItem.href),
        },
    ];

    for (const ancestor of match.ancestors.slice(1)) {
        breadcrumbs.push({
            label: ancestor.label,
            href: normalizeHref(ancestor.href),
        });
    }

    breadcrumbs.push({ label: match.item.label });

    let currentPath = match.href;

    const remainingPath =
        path === match.href ? "" : path.slice(match.href.length);

    const segments = remainingPath.split("/").filter(Boolean);

    segments.forEach((segment, index) => {
        currentPath += `/${segment}`;

        breadcrumbs.push({
            label: formatSegment(segment),
            href: index < segments.length - 1 ? currentPath : undefined,
        });
    });

    return breadcrumbs;
}
