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
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Provisional permission key for future nav gating */
  requiredPermission?: string;
};

export const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiredPermission: 'platform:VIEW' },
  {
    label: 'Organization',
    href: '/organization',
    icon: Building2,
    requiredPermission: 'organization:VIEW',
  },
  {
    label: 'Roles & permissions',
    href: '/roles-permissions',
    icon: Shield,
    requiredPermission: 'roles:VIEW',
  },
  {
    label: 'Fleet & leasing',
    href: '/fleet-leasing',
    icon: Car,
    requiredPermission: 'fleet:VIEW',
  },
  {
    label: 'Asset management',
    href: '/asset-management',
    icon: ClipboardList,
    requiredPermission: 'assets:VIEW',
  },
  { label: 'Workshop', href: '/workshop', icon: Wrench, requiredPermission: 'workshop:VIEW' },
  { label: 'Inventory', href: '/inventory', icon: Package, requiredPermission: 'inventory:VIEW' },
  {
    label: 'Procurement',
    href: '/procurement',
    icon: ShoppingCart,
    requiredPermission: 'procurement:VIEW',
  },
  { label: 'Finance', href: '/finance', icon: Wallet, requiredPermission: 'finance:VIEW' },
];

/** Placeholder — wire to auth session + permission set from API. */
export function filterNavByPermissions(
  items: NavItem[],
  permissions: Set<string> | null,
): NavItem[] {
  if (!permissions) {
    return items;
  }
  return items.filter(
    (item) => !item.requiredPermission || permissions.has(item.requiredPermission),
  );
}
