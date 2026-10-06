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

    // ============================================================
    // CUSTOMERS
    // ============================================================

    "/customers": [
        {
            label: "Customers",
        },
    ],

    "/customers/corporate": [
        {
            label: "Customers",
            href: "/customers",
        },
        {
            label: "Corporate Customers",
        },
    ],
};