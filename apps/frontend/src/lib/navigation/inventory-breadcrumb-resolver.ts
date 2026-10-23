import type { BreadcrumbItem } from "@/config/breadcrumb-config";

function normalizePath(path: string): string {
    const normalized = path.split("?")[0].replace(/\/+$/, "");
    return normalized || "/";
}

export function resolveInventoryBreadcrumbs(
    pathname: string,
    searchParams: URLSearchParams,
): BreadcrumbItem[] {
    void searchParams;
    const path = normalizePath(pathname);

    const stockRegister = "/inventory/Stock-register";
    const stockReceipt = "/inventory/stock-receipt";
    const stockBalance = "/inventory/stock-balance";
    const partsRequests = "/inventory/parts-requests";

    // Inventory dashboard
    if (path === "/inventory") {
        return [{ label: "Inventory" }];
    }

    // Stock Register
    if (path === stockRegister) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Register" },
        ];
    }

    if (path === `${stockRegister}/create`) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Register", href: stockRegister },
            { label: "New" },
        ];
    }

    if (path === `${stockRegister}/detail`) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Register", href: stockRegister },
            { label: "View Details" },
        ];
    }

    if (path === `${stockRegister}/edit`) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Register", href: stockRegister },
            { label: "Edit" },
        ];
    }

    if (new RegExp(`^${stockRegister}/[^/]+/edit$`).test(path)) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Register", href: stockRegister },
            { label: "Edit" },
        ];
    }

    if (new RegExp(`^${stockRegister}/[^/]+$`).test(path)) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Register", href: stockRegister },
            { label: "View Details" },
        ];
    }

    // Stock Balance
    if (path === stockBalance) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Balance" },
        ];
    }

    if (path === `${stockBalance}/detail`) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Balance", href: stockBalance },
            { label: "View Details" },
        ];
    }

    if (new RegExp(`^${stockBalance}/[^/]+/detail$`).test(path)) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Balance", href: stockBalance },
            { label: "View Details" },
        ];
    }

    if (new RegExp(`^${stockBalance}/[^/]+$`).test(path)) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Balance", href: stockBalance },
            { label: "View Details" },
        ];
    }

    // Stock Receipt
    if (path === stockReceipt) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Receipt" },
        ];
    }

    if (path === `${stockReceipt}/create`) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Receipt", href: stockReceipt },
            { label: "New" },
        ];
    }

    if (path === `${stockReceipt}/detail`) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Receipt", href: stockReceipt },
            { label: "View Details" },
        ];
    }

    if (path === `${stockReceipt}/edit`) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Receipt", href: stockReceipt },
            { label: "Edit" },
        ];
    }

    if (new RegExp(`^${stockReceipt}/[^/]+/edit$`).test(path)) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Receipt", href: stockReceipt },
            { label: "Edit" },
        ];
    }

    if (new RegExp(`^${stockReceipt}/[^/]+$`).test(path)) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Stock Receipt", href: stockReceipt },
            { label: "View Details" },
        ];
    }

    // Parts Requests
    if (path === partsRequests) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Parts Requests" },
        ];
    }

    if (
        path === `${partsRequests}/detail` ||
        new RegExp(`^${partsRequests}/[^/]+/detail$`).test(path)
    ) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Parts Requests", href: partsRequests },
            { label: "View Details" },
        ];
    }

    if (new RegExp(`^${partsRequests}/[^/]+$`).test(path)) {
        return [
            { label: "Inventory", href: "/inventory" },
            { label: "Parts Requests", href: partsRequests },
            { label: "View Details" },
        ];
    }

    return [];
}
