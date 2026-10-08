// src/config/breadcrumb-config.ts

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export const breadcrumbConfig: Record<
    string,
    BreadcrumbItem[]
> = {
    // ============================================================
    // ORGANISATION
    // ============================================================

    "/organization": [
        {
            label: "Organisation",
        },
    ],

    // ----------------------------
    // Clients
    // ----------------------------

    "/organization/clients": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Clients",
        },
    ],

    "/organization/clients/create": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Clients",
            href: "/organization/clients",
        },
        {
            label: "Create Client",
        },
    ],

    // ----------------------------
    // Driver Register
    // ----------------------------

    "/organization/driver-register": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Driver Register",
        },
    ],

    "/organization/driver-register/create": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Driver Register",
            href: "/organization/driver-register",
        },
        {
            label: "Create Driver",
        },
    ],

    // Existing route support
    "/organization/driver-register/add-driver": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Driver Register",
            href: "/organization/driver-register",
        },
        {
            label: "Add Driver",
        },
    ],

    // ----------------------------
    // Employees
    // ----------------------------

    "/organization/employees": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Employees",
        },
    ],

    "/organization/employees/create": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Employees",
            href: "/organization/employees",
        },
        {
            label: "Create Employee",
        },
    ],

    // ----------------------------
    // Locations
    // ----------------------------

    "/organization/locations": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Locations",
        },
    ],

    "/organization/locations/create": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Locations",
            href: "/organization/locations",
        },
        {
            label: "Create Location",
        },
    ],

    // ----------------------------
    // Suppliers
    // ----------------------------

    "/organization/suppliers": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Suppliers",
        },
    ],

    "/organization/suppliers/create": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Suppliers",
            href: "/organization/suppliers",
        },
        {
            label: "Create Supplier",
        },
    ],

    // ============================================================
    // ASSET MANAGEMENT
    // ============================================================

    "/asset-register": [
        {
            label: "Asset Management",
        },
    ],

    // ----------------------------
    // Asset Classes
    // ----------------------------

    "/asset-register/assestclass": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Asset Classes",
        },
    ],

    "/asset-register/assestclass/create": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Asset Classes",
            href: "/asset-register/assestclass",
        },
        {
            label: "Create Asset Class",
        },
    ],

    // ----------------------------
    // Fleet Register
    // ----------------------------

    "/asset-register/fleetregister": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Fleet Register",
        },
    ],

    "/asset-register/fleetregister/create": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Fleet Register",
            href: "/asset-register/fleetregister",
        },
        {
            label: "Create Fleet",
        },
    ],

    // ----------------------------
    // Asset Assignment
    // ----------------------------

    "/asset-register/asset-assign": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Asset Assignment",
        },
    ],

    // ----------------------------
    // Compliance & Renewals
    // ----------------------------

    "/asset-register/compliance-renewals": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Compliance & Renewals",
        },
    ],

    // ============================================================
    // PROCUREMENT
    // ============================================================

    "/procurement": [
        {
            label: "Procurement",
        },
    ],

    "/procurement/suppliers": [
        {
            label: "Procurement",
            href: "/procurement",
        },
        {
            label: "Suppliers",
        },
    ],

    "/procurement/create-supplier": [
        {
            label: "Procurement",
            href: "/procurement",
        },
        {
            label: "Suppliers",
            href: "/procurement/suppliers",
        },
        {
            label: "Create Supplier",
        },
    ],

    // ============================================================
    // FLEET LEASING
    // ============================================================

    "/fleet-leasing": [
        {
            label: "Fleet Leasing",
        },
    ],

    "/fleet-leasing/contracts": [
        {
            label: "Fleet Leasing",
            href: "/fleet-leasing",
        },
        {
            label: "Contracts",
        },
    ],

    "/fleet-leasing/lease-contracts": [
        {
            label: "Fleet Leasing",
            href: "/fleet-leasing",
        },
        {
            label: "Lease Contracts",
        },
    ],

    "/fleet-leasing/lease-contracts/detail/change-history": [
        {
            label: "Fleet Leasing",
            href: "/fleet-leasing",
        },
        {
            label: "Lease Contracts",
            href: "/fleet-leasing/lease-contracts",
        },
        {
            label: "Change history",
        },
    ],

    "/fleet-leasing/renewals-extensions": [
        {
            label: "Fleet Leasing",
            href: "/fleet-leasing",
        },
        {
            label: "Renewals & Extensions",
        },
    ],

    "/fleet-leasing/renewals-extensions/renew": [
        {
            label: "Fleet Leasing",
            href: "/fleet-leasing",
        },
        {
            label: "Renewals & Extensions",
            href: "/fleet-leasing/renewals-extensions",
        },
        {
            label: "Renew contract",
        },
    ],

    "/fleet-leasing/returns-inspections": [
        {
            label: "Fleet Leasing",
            href: "/fleet-leasing",
        },
        {
            label: "Returns & Inspections",
        },
    ],

    // ============================================================
    // INVENTORY
    // ============================================================

    "/inventory": [
        {
            label: "Inventory",
        },
    ],

    // ----------------------------
    // Stock Receipt
    // ----------------------------

    "/inventory/stock-receipt": [
        {
            label: "Inventory",
            href: "/inventory",
        },
        {
            label: "Stock Receipt",
        },
    ],

    "/inventory/stock-receipt/create": [
        {
            label: "Inventory",
            href: "/inventory",
        },
        {
            label: "Stock Receipt",
            href: "/inventory/stock-receipt",
        },
        {
            label: "Create Stock Receipt",
        },
    ],

    // ============================================================
    // FINANCE
    // ============================================================

    "/finance/vendor-payments": [
        {
            label: "Finance",
            href: "/finance/invoices",
        },
        {
            label: "Vendor Payments",
        },
    ],

    "/finance/vendor-payments/record": [
        {
            label: "Finance",
            href: "/finance/invoices",
        },
        {
            label: "Vendor Payments",
            href: "/finance/vendor-payments",
        },
        {
            label: "Record Payment",
        },
    ],

    "/finance/vendor-payments/detail": [
        {
            label: "Finance",
            href: "/finance/invoices",
        },
        {
            label: "Vendor Payments",
            href: "/finance/vendor-payments",
        },
        {
            label: "Payment detail",
        },
    ],

    "/finance/client-statements": [
        {
            label: "Finance",
            href: "/finance/invoices",
        },
        {
            label: "Client Statements",
        },
    ],

    "/finance/client-statements/detail": [
        {
            label: "Finance",
            href: "/finance/invoices",
        },
        {
            label: "Client Statements",
            href: "/finance/client-statements",
        },
        {
            label: "Client detail",
        },
    ],
};