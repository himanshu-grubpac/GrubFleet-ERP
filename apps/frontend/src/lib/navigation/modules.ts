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
  ClipboardCheck,
  RefreshCw,
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
    href: "/dashboard",
    icon: LayoutDashboard,
    requiredPermission: "dashboard.view",
  },

  // ============================================================
  // FLEET & LEASING
  // ============================================================
  {
    label: "Fleet & leasing",
    href: "/fleet-leasing",
    icon: Car,
    requiredPermission: "fleet_leasing.view",

    children: [
      {
        label: "Lease Contracts",
        href: "/fleet-leasing/lease-contracts",
        icon: FileText,
      },
      {
        label: "Corporate Customers",
        href: "/fleet-leasing/corporate-customers",
        icon: Users,
      },
      {
        label: "Vehicle Allocation & Reallocation",
        href: "/fleet-leasing/vehicle-allocation",
        icon: ArrowLeftRight,
      },
      {
        label: "Returns & Inspections",
        href: "/fleet-leasing/returns-inspections",
        icon: ClipboardCheck,
      },
      {
        label: "Renewals & Extensions",
        href: "/fleet-leasing/renewals-extensions",
        icon: RefreshCw,
      },
    ],
  },
  // ============================================================
  // ASSET MANAGEMENT
  // ============================================================
  {
    label: "Asset Management",
    href: "/asset-management",
    icon: ClipboardList,
    requiredPermission: "asset_register.view",
    children: [
      {
        label: "Asset Classes",
        href: "/asset-register/assestclass",
        icon: ClipboardList,
      },
      {
        label: "Fleet Register",
        href: "/asset-register/fleetregister",
        icon: Car,
      },
      {
        label: "Asset Assignment",
        href: "/asset-register/assetassignment",
        icon: ArrowLeftRight,
      },
      {
        label: "Compliance & Renewals",
        href: "/asset-register/compliance-renewals",
        icon: Shield,
      },
    ],
  },

  // ============================================================
  // WORKSHOP
  // ============================================================
  {
    label: "Workshop",
    href: "/workshop",
    icon: Wrench,
    requiredPermission: "workshop.view",
  },

  // ============================================================
  // INVENTORY
  // ============================================================
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    requiredPermission: "inventory.view",
  },

  // ============================================================
  // ORGANIZATION
  // ============================================================
  {
    label: "Organization",
    href: "/organization",
    icon: Building2,
    requiredPermission: "organisation.view",

    children: [
      {
        label: "Locations",
        href: "/organization/locations",
        icon: MapPin,
      },
      {
        label: "Suppliers",
        href: "/organization/suppliers",
        icon: Truck,
      },
      {
        label: "Employees",
        href: "/organization/employees",
        icon: UserRound,
      },
      {
        label: "Driver Register",
        href: "/organization/driver-register",
        icon: Contact,
      },
      {
        label: "Clients",
        href: "/organization/clients",
        icon: Users,
      },
    ],
  },

  // ============================================================
  // FINANCE
  // ============================================================
  {
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    requiredPermission: "finance.view",
  },

  // ============================================================
  // ADMINISTRATION
  // ============================================================
  {
    label: "Administration",
    href: "/administration",
    icon: Shield,
    requiredPermission: "administration.view",
  },

  // ============================================================
  // PLATFORM
  // ============================================================
  {
    label: "Platform",
    href: "/platform",
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