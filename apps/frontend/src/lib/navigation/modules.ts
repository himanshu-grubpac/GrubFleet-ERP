import type { LucideIcon } from "lucide-react";

import {
  Building2,
  Car,
  ClipboardList,
  LayoutDashboard,
  Package,
  Shield,
  Wallet,
  Wrench,
  Settings,
  FileText,
  Users,
  ArrowLeftRight,
  RefreshCw,
  ClipboardCheck,
  MapPin,
  Truck,
  UserRound,
  Contact,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  requiredPermission?: string;
  children?: NavItem[];
};
export const mainNavItems: NavItem[] = [
  // ============================================================
  // DASHBOARD
  // ============================================================
  {
    label: "Dashboard",
    href: "/dashboard/",
    icon: LayoutDashboard,
    requiredPermission: "dashboard.view",
  },

  // ============================================================
  // FLEET & LEASING
  // ============================================================
  {
    label: "Fleet & leasing",
    href: "/fleet-leasing/",
    icon: Car,
    requiredPermission: "fleet_leasing.view",

    children: [
      {
        label: "Lease Contracts",
        href: "/fleet-leasing/lease-contracts/",
        icon: FileText,
      },
      {
        label: "Renewals & Extensions",
        href: "/fleet-leasing/renewals-extensions/",
        icon: RefreshCw,
      },
      {
        label: "Returns & Inspections",
        href: "/fleet-leasing/returns-inspections/",
        icon: ClipboardCheck,
      },
    ],
  },
  // ============================================================
  // ASSET MANAGEMENT
  // ============================================================
  {
    label: "Asset Management",
    href: "/asset-register/",
    icon: ClipboardList,
    requiredPermission: "asset_register.view",
    children: [
      {
        label: "Asset Class",
        href: "/asset-register/assestclass/",
        icon: ClipboardList,
      },
      {
        label: "Asset Master",
        href: "/asset-register/asset-master/",
        icon: Shield,
      },
      {
        label: "Fleet Register",
        href: "/asset-register/fleetregister/",
        icon: Car,
      },
      {
        label: "Asset Assignment",
        href: "/asset-register/asset-assign/",
        icon: ArrowLeftRight,
      },
      {
        label: "Compliance & Renewals",
        href: "/asset-register/compliance-renewals/",
        icon: Shield,
      },

    ],
  },

  // ============================================================
  // WORKSHOP
  // ============================================================
  {
    label: "Workshop",
    href: "/workshop/",
    icon: Wrench,
    requiredPermission: "workshop.view",

    children: [
      {
        label: "Work Orders",
        href: "/workshop/work-order/",
        icon: ClipboardList,
      },
      {
        label: "Labour Rate Cards",
        href: "/workshop/labour-rate-cards/",
        icon: FileText,
      },
      {
        label: "AMC & Maintenance",
        href: "/workshop/amc-maintenance/",
        icon: Settings,
      },
    ],
  },

  // ============================================================
  // INVENTORY
  // ============================================================
  {
    label: "Inventory",
    href: "/inventory/",
    icon: Package,
    requiredPermission: "inventory.view",

    children: [

      {
        label: "Stock Register",
        href: "/inventory/Stock-register/",
        icon: Package,
      },

      {
        label: "Stock Balance",
        href: "/inventory/stock-balance/",
        icon: ClipboardList,
      },
      {
        label: "Stock Receipt",
        href: "/inventory/stock-receipt/",
        icon: ClipboardCheck,
      },
      {
        label: "Parts Requests",
        href: "/inventory/parts-requests/",
        icon: Wrench,
      },
    ],
  },

  // ============================================================
  // ORGANIZATION
  // ============================================================
  {
    label: "Organization",
    href: "/organization/",
    icon: Building2,
    requiredPermission: "organisation.view",

    children: [
      {
        label: "Locations",
        href: "/organization/locations/",
        icon: MapPin,
      },
      {
        label: "Suppliers",
        href: "/organization/suppliers/",
        icon: Truck,
      },
      {
        label: "Employees",
        href: "/organization/employees/",
        icon: UserRound,
      },
      {
        label: "Driver Register",
        href: "/organization/driver-register/",
        icon: Contact,
      },
      {
        label: "Clients",
        href: "/organization/clients/",
        icon: Users,
      },
    ],
  },

  // ============================================================
  // FINANCE
  // ============================================================
  {
    label: "Finance",
    href: "/finance/",
    icon: Wallet,
    requiredPermission: "finance.view",
    children: [
      {
        label: "Invoices",
        href: "/finance/invoices/",
        icon: FileText,
      },
      {
        label: "Client Statements",
        href: "/finance/client-statements/",
        icon: FileText,
      },
      {
        label: "Vendor Payments",
        href: "/finance/vendor-payments/",
        icon: Wallet,
      },
    ],
  },

  // ============================================================
  // ADMINISTRATION
  // ============================================================
  {
    label: "Administration",
    href: "/administration/",
    icon: Shield,
    requiredPermission: "administration.view",
  },

  // ============================================================
  // PLATFORM
  // ============================================================
  {
    label: "Platform",
    href: "/platform/",
    icon: Settings,
    requiredPermission: "platform.view",
  },
];

// ============================================================
// FILTER NAVIGATION BY PERMISSIONS
// ============================================================

export function filterNavByPermissions(
  items: NavItem[],
  permissions: Set<string> | null,
): NavItem[] {
  if (!permissions) {
    return items;
  }

  return items.filter(
    (item) =>
      !item.requiredPermission ||
      permissions.has(item.requiredPermission),
  );
}