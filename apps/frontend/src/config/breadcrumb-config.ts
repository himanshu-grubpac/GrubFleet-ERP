// src/config/breadcrumb-config.ts

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export const breadcrumbConfig: Record<string, BreadcrumbItem[]> = {
    // Organisation
    "/organization": [
        {
            label: "Organisation",
        },
    ],

    "/organization/locations": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Locations",
        },
    ],

    "/organization/suppliers": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Suppliers",
        },
    ],

    "/organization/clients": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Clients",
        },
    ],

    "/organization/driver-register": [
        {
            label: "Organisation",
            href: "/organization",
        },
        {
            label: "Driver Register",
        },
    ],

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
            label: "Add Employee",
        },
    ],
    // Procurement
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

    // Fleet Leasing
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

    // Customers
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