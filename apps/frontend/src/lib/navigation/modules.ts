import type { LucideIcon } from 'lucide-react';

import {
  Building2,
  Car,
  ClipboardList,
  LayoutDashboard,
  Package,
  Shield,
  ShoppingCart,
  Wallet,
  Wrench,
  Settings,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  requiredPermission?: string;
};

export const mainNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    requiredPermission: 'dashboard.view',
  },

  {
    label: 'Fleet & leasing',
    href: '/fleet-leasing',
    icon: Car,
    requiredPermission: 'fleet_leasing.view',
  },

  {
    label: 'Asset Register',
    href: '/asset-register',
    icon: ClipboardList,
    requiredPermission: 'asset_register.view',
  },

  {
    label: 'Workshop',
    href: '/workshop',
    icon: Wrench,
    requiredPermission: 'workshop.view',
  },

  {
    label: 'Inventory',
    href: '/inventory',
    icon: Package,
    requiredPermission: 'inventory.view',
  },

  {
    label: 'Organization',
    href: '/organization',
    icon: Building2,
    requiredPermission: 'organisation.view',
  },

  {
    label: 'Finance',
    href: '/finance',
    icon: Wallet,
    requiredPermission: 'finance.view',
  },

  {
    label: 'Administration',
    href: '/administration',
    icon: Shield,
    requiredPermission: 'administration.view',
  },

  {
    label: 'Platform',
    href: '/platform',
    icon: Settings,
    requiredPermission: 'platform.view',
  },
];

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