import type { LucideIcon } from "lucide-react";
import { LayoutDashboard } from "lucide-react";

import { mainNavItems, type NavItem } from "@/lib/navigation/modules";
import { normalizeNavPath } from "@/lib/navigation/nav-path-match";

export type ModuleHubQuickLink = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

/** Hub card copy keyed by normalized child href — labels/icons come from `mainNavItems`. */
const MODULE_HUB_LINK_DESCRIPTIONS: Record<string, string> = {
  [normalizeNavPath("/fleet-leasing/lease-contracts/")]:
    "Create and manage lease contracts, client details, leased assets, and contract terms.",
  [normalizeNavPath("/fleet-leasing/renewals-extensions/")]:
    "Review upcoming contract expiries and manage lease renewals and extensions.",
  [normalizeNavPath("/fleet-leasing/support/")]:
    "Access fleet leasing support workflows such as vehicle replacement for active contracts.",

  [normalizeNavPath("/asset-register/assestclass/")]:
    "Create and manage asset classes, vehicle types, and default specifications.",
  [normalizeNavPath("/asset-register/fleetregister/")]:
    "View and manage fleet vehicles, registration details, and vehicle information.",
  [normalizeNavPath("/asset-register/asset-assign/")]:
    "Manage asset assignments and track assets allocated to employees or locations.",
  [normalizeNavPath("/asset-register/vehicle-returns/")]:
    "Receive returned vehicles, run inspections, and move assets back into the available pool.",
  [normalizeNavPath("/asset-register/compliance-renewals/")]:
    "Track vehicle compliance, insurance renewals, and important expiry dates.",

  [normalizeNavPath("/workshop/work-order/")]:
    "Create, view, and manage workshop work orders and repair activities.",
  [normalizeNavPath("/workshop/service-packages/")]:
    "Manage labour categories, service rates, and workshop labour pricing.",
  [normalizeNavPath("/workshop/amc-maintenance/")]:
    "Manage annual maintenance contracts and scheduled maintenance activities.",

  [normalizeNavPath("/inventory/Stock-register/")]:
    "Manage parts, stock item details, units of measure, and pricing information.",
  [normalizeNavPath("/inventory/stock-balance/")]:
    "View current stock quantities across workshops, warehouses, and other locations.",
  [normalizeNavPath("/inventory/stock-receipt/")]:
    "Record incoming stock and update on-hand quantities through stock receipts.",
  [normalizeNavPath("/inventory/parts-requests/")]:
    "Manage parts requests and track fulfilment for workshop requirements.",

  [normalizeNavPath("/organisation/locations/")]:
    "Manage offices, workshops, warehouses, and other organizational locations.",
  [normalizeNavPath("/organisation/suppliers/")]:
    "Maintain supplier details, contact information, and business addresses.",
  [normalizeNavPath("/organisation/employees/")]:
    "Manage employee records, organizational details, and employee status.",
  [normalizeNavPath("/organisation/driver-register/")]:
    "Maintain driver records and manage driver information.",
  [normalizeNavPath("/organisation/clients/")]:
    "Manage client records, contact details, and associated business information.",

  [normalizeNavPath("/finance/invoices/")]:
    "Manage invoices, review billing records, and track invoice status.",
  [normalizeNavPath("/finance/client-statements/")]:
    "Review client account statements and outstanding balances.",
  [normalizeNavPath("/finance/vendor-payments/")]:
    "Manage vendor payment records and track payment status.",

  [normalizeNavPath("/administration/roles/")]:
    "Create and manage roles, assign permissions, and control access across application modules.",
};

/** Portal home — top-level module hubs (labels/icons from filtered `mainNavItems`). */
const PORTAL_MAIN_MODULE_DESCRIPTIONS: Record<string, string> = {
  [normalizeNavPath("/fleet-leasing/")]:
    "Manage lease contracts, renewals, extensions, and fleet leasing support.",
  [normalizeNavPath("/asset-register/")]:
    "Manage asset classes, fleet register, assignments, vehicle returns, and compliance renewals.",
  [normalizeNavPath("/workshop/")]:
    "Manage work orders, service packages, and AMC maintenance schedules.",
  [normalizeNavPath("/inventory/")]:
    "Manage stock register, balances, receipts, and parts requests.",
  [normalizeNavPath("/organisation/")]:
    "Manage locations, suppliers, employees, drivers, and clients.",
  [normalizeNavPath("/finance/")]:
    "Manage invoices, client statements, and vendor payments.",
  [normalizeNavPath("/administration/")]:
    "Manage roles, permissions, and access across the portal.",
};

const DASHBOARD_HOME_HREF = normalizeNavPath("/dashboard/");

function findModuleNavItem(moduleRootHref: string): NavItem | undefined {
  const normalizedRoot = normalizeNavPath(moduleRootHref);
  return mainNavItems.find(
    (item) => normalizeNavPath(item.href) === normalizedRoot,
  );
}

/**
 * Top-level submodule quick links for a module hub — same children as sidebar nav
 * (nested nav items such as Support → Vehicle Replacement are not duplicated here).
 */
/**
 * Top-level module cards for the portal home — same entries as sidebar roots
 * (excluding Dashboard). Pass RBAC-filtered nav items from `filterNavByPermissions`.
 */
export function getPortalMainModuleQuickLinks(
  navItems: NavItem[],
): ModuleHubQuickLink[] {
  return navItems
    .filter(
      (item) => normalizeNavPath(item.href) !== DASHBOARD_HOME_HREF,
    )
    .map((item) => {
      const normalizedHref = normalizeNavPath(item.href);
      const description =
        PORTAL_MAIN_MODULE_DESCRIPTIONS[normalizedHref] ??
        `Open ${item.label} to continue.`;

      return {
        title: item.label,
        href: item.href,
        icon: item.icon ?? LayoutDashboard,
        description,
      };
    });
}

export function getModuleHubQuickLinks(
  moduleRootHref: string,
): ModuleHubQuickLink[] {
  const moduleItem = findModuleNavItem(moduleRootHref);
  const children = moduleItem?.children ?? [];

  return children.map((child) => {
    const normalizedHref = normalizeNavPath(child.href);
    const description =
      MODULE_HUB_LINK_DESCRIPTIONS[normalizedHref] ??
      `Open ${child.label} to continue.`;

    return {
      title: child.label,
      href: child.href,
      icon: child.icon ?? LayoutDashboard,
      description,
    };
  });
}
