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

    "/organisation": [
        {
            label: "Organisation",
        },
    ],

    // ----------------------------
    // Clients
    // ----------------------------

    "/organisation/clients": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Clients",
        },
    ],

    "/organisation/clients/create": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Clients",
            href: "/organisation/clients",
        },
        {
            label: "Create Client",
        },
    ],

    // ----------------------------
    // Driver Register
    // ----------------------------

    "/organisation/driver-register": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Driver Register",
        },
    ],

    "/organisation/driver-register/create": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Driver Register",
            href: "/organisation/driver-register",
        },
        {
            label: "Create Driver",
        },
    ],

    // Existing route support
    "/organisation/driver-register/add-driver": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Driver Register",
            href: "/organisation/driver-register",
        },
        {
            label: "Add Driver",
        },
    ],

    // ----------------------------
    // Employees
    // ----------------------------

    "/organisation/employees": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Employees",
        },
    ],

    "/organisation/employees/create": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Employees",
            href: "/organisation/employees",
        },
        {
            label: "Create Employee",
        },
    ],

    // ----------------------------
    // Locations
    // ----------------------------

    "/organisation/locations": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Locations",
        },
    ],

    "/organisation/locations/create": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Locations",
            href: "/organisation/locations",
        },
        {
            label: "Create Location",
        },
    ],

    // ----------------------------
    // Suppliers
    // ----------------------------

    "/organisation/suppliers": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Suppliers",
        },
    ],

    "/organisation/suppliers/create": [
        {
            label: "Organisation",
            href: "/organisation",
        },
        {
            label: "Suppliers",
            href: "/organisation/suppliers",
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

    "/asset-register/asset-assign/bulk": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Asset Assignment",
            href: "/asset-register/asset-assign/",
        },
        {
            label: "Bulk assign",
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

    "/fleet-leasing/support": [
        {
            label: "Fleet Leasing",
            href: "/fleet-leasing",
        },
        {
            label: "Support",
        },
    ],

    "/fleet-leasing/support/vehicle-replacement": [
        {
            label: "Fleet Leasing",
            href: "/fleet-leasing",
        },
        {
            label: "Support",
            href: "/fleet-leasing/support",
        },
        {
            label: "Vehicle replacement",
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

    // ----------------------------
    // Stock Receipt
    // ----------------------------

    "/inventory/stock-receipt/detail": [
        { label: "Inventory", href: "/inventory" },
        { label: "Stock Receipt", href: "/inventory/stock-receipt" },
        { label: "View Details" },
    ],

    "/inventory/stock-receipt/edit": [
        { label: "Inventory", href: "/inventory" },
        { label: "Stock Receipt", href: "/inventory/stock-receipt" },
        { label: "Edit" },
    ],

    // ----------------------------
    // Stock Register
    // ----------------------------

    "/inventory/Stock-register": [
        { label: "Inventory", href: "/inventory" },
        { label: "Stock Register" },
    ],

    "/inventory/Stock-register/create": [
        { label: "Inventory", href: "/inventory" },
        { label: "Stock Register", href: "/inventory/Stock-register" },
        { label: "Create Stock" },
    ],

    "/inventory/Stock-register/detail": [
        { label: "Inventory", href: "/inventory" },
        { label: "Stock Register", href: "/inventory/Stock-register" },
        { label: "View Details" },
    ],

    "/inventory/Stock-register/edit": [
        { label: "Inventory", href: "/inventory" },
        { label: "Stock Register", href: "/inventory/Stock-register" },
        { label: "Edit" },
    ],

    // ----------------------------
    // Stock Balance
    // ----------------------------

    "/inventory/stock-balance": [
        { label: "Inventory", href: "/inventory" },
        { label: "Stock Balance" },
    ],

    "/inventory/stock-balance/detail": [
        { label: "Inventory", href: "/inventory" },
        { label: "Stock Balance", href: "/inventory/stock-balance" },
        { label: "View Details" },
    ],

    // ----------------------------
    // Parts Requests
    // ----------------------------

    "/inventory/parts-requests": [
        { label: "Inventory", href: "/inventory" },
    ],

    "/inventory/parts-requests/detail": [
        { label: "Inventory", href: "/inventory" },
        { label: "Parts Requests", href: "/inventory/parts-requests" },
        { label: "View Details" },
    ],


    // ============================================================
    // FINANCE
    // ============================================================

    "/finance": [
        {
            label: "Finance",
        },
    ],

    // ----------------------------
    // Invoices
    // ----------------------------

    "/finance/invoices": [
        {
            label: "Finance",
            href: "/finance",
        },
        {
            label: "Invoices",
        },
    ],

    "/finance/invoices/new": [
        {
            label: "Finance",
            href: "/finance",
        },
        {
            label: "Invoices",
            href: "/finance/invoices",
        },
        {
            label: "New Invoice",
        },
    ],

    "/finance/invoices/new/purchase": [
        {
            label: "Finance",
            href: "/finance",
        },
        {
            label: "Invoices",
            href: "/finance/invoices",
        },
        {
            label: "New Invoice",
            href: "/finance/invoices/new",
        },
        {
            label: "Purchase",
        },
    ],

    "/finance/invoices/new/sale": [
        {
            label: "Finance",
            href: "/finance",
        },
        {
            label: "Invoices",
            href: "/finance/invoices",
        },
        {
            label: "New Invoice",
            href: "/finance/invoices/new",
        },
        {
            label: "Sale",
        },
    ],

    "/finance/invoices/new/billing": [
        {
            label: "Finance",
            href: "/finance",
        },
        {
            label: "Invoices",
            href: "/finance/invoices",
        },
        {
            label: "New Invoice",
            href: "/finance/invoices/new",
        },
        {
            label: "Billing",
        },
    ],

    "/finance/invoices/detail": [
        {
            label: "Finance",
            href: "/finance",
        },
        {
            label: "Invoices",
            href: "/finance/invoices",
        },
        {
            label: "Invoice Details",
        },
    ],

    // ----------------------------
    // Client Statements
    // ----------------------------

    "/finance/client-statements": [
        {
            label: "Finance",
            href: "/finance",
        },
        {
            label: "Client Statements",
        },
    ],

    "/finance/client-statements/detail": [
        {
            label: "Finance",
            href: "/finance",
        },
        {
            label: "Client Statements",
            href: "/finance/client-statements",
        },
        {
            label: "Statement Details",
        },
    ],

    // ----------------------------
    // Vendor Payments
    // ----------------------------

    "/finance/vendor-payments": [
        {
            label: "Finance",
            href: "/finance",
        },
        {
            label: "Vendor Payments",
        },
    ],

    "/finance/vendor-payments/record": [
        {
            label: "Finance",
            href: "/finance",
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
            href: "/finance",
        },
        {
            label: "Vendor Payments",
            href: "/finance/vendor-payments",
        },
        {
            label: "Payment Details",
        },
    ],

    // ============================================================
    // WORKSHOP
    // ============================================================

    "/workshop": [
        {
            label: "Workshop",
        },
    ],

    // ----------------------------
    // AMC Maintenance
    // ----------------------------

    "/workshop/amc-maintenance": [
        {
            label: "Workshop",
            href: "/workshop",
        },
        {
            label: "AMC Maintenance",
        },
    ],

    // ----------------------------
    // AMC Schedule
    // ----------------------------

    "/workshop/amc-maintenance/schedule": [
        {
            label: "Workshop",
            href: "/workshop",
        },
        {
            label: "AMC Maintenance",
            href: "/workshop/amc-maintenance",
        },
        {
            label: "Schedule",
        },
    ],

    "/workshop/amc-maintenance/schedule/create": [
        {
            label: "Workshop",
            href: "/workshop",
        },
        {
            label: "AMC Maintenance",
            href: "/workshop/amc-maintenance",
        },
        {
            label: "Schedule",
            href: "/workshop/amc-maintenance/schedule",
        },
        {
            label: "Create Schedule",
        },
    ],

    // ----------------------------
    // AMC Tier
    // ----------------------------

    "/workshop/amc-maintenance/tier": [
        {
            label: "Workshop",
            href: "/workshop",
        },
        {
            label: "AMC Maintenance",
            href: "/workshop/amc-maintenance",
        },
        {
            label: "Tier",
        },
    ],

    // ----------------------------
    // Work Orders
    // ----------------------------

    "/workshop/work-order": [
        {
            label: "Workshop",
            href: "/workshop",
        },
        {
            label: "Work Order",
        },
    ],

    "/workshop/work-order/create": [
        {
            label: "Workshop",
            href: "/workshop",
        },
        {
            label: "Work Order",
            href: "/workshop/work-order",
        },
        {
            label: "Create Work Order",
        },
    ],

    // Work Order Details (dynamic [id] route)
    "/workshop/work-order/[id]": [
        {
            label: "Workshop",
            href: "/workshop",
        },
        {
            label: "Work Order",
            href: "/workshop/work-order",
        },
        {
            label: "Work Order Details",
        },
    ],

    // Asset Class View
    "/asset-register/assestclass/detail": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Asset Class",
            href: "/asset-register/assestclass",
        },
        {
            label: "View Asset Class",
        },
    ],

    // Asset Class Edit
    "/asset-register/assestclass/edit": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Asset Class",
            href: "/asset-register/assestclass",
        },
        {
            label: "Edit Asset Class",
        },
    ],

    // Fleet Register View
    "/asset-register/fleetregister/detail": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Fleet Register",
            href: "/asset-register/fleetregister",
        },
        {
            label: "View Vehicle",
        },
    ],

    // Fleet Register Edit
    "/asset-register/fleetregister/edit": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Fleet Register",
            href: "/asset-register/fleetregister",
        },
        {
            label: "Edit Vehicle",
        },
    ],

    // Fleet Register Lease History
    "/asset-register/fleetregister/detail/lease-history": [
        {
            label: "Asset Management",
            href: "/asset-register",
        },
        {
            label: "Fleet Register",
            href: "/asset-register/fleetregister",
        },
        {
            label: "Lease History",
        },
    ],


    // ============================================================
    // ADMINISTRATION
    // ============================================================

    "/administration": [
        {
            label: "Administration",
        },
    ],

    // Roles & Permissions
    "/administration/roles": [
        {
            label: "Administration",
            href: "/administration",
        },
        {
            label: "Roles & Permissions",
        },
    ],

    // Create Role
    "/administration/roles/create": [
        {
            label: "Administration",
            href: "/administration",
        },
        {
            label: "Roles & Permissions",
            href: "/administration/roles",
        },
        {
            label: "New",
        },
    ],


};

