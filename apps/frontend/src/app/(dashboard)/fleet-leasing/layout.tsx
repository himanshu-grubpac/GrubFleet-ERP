'use client';

import { LeaseContractsProvider } from '@/lib/api/lease-contracts-context';

/**
 * Fleet & leasing module shell — provider hoisted here so sibling sub-routes
 * (lease contracts, renewals, returns, support) share one client boundary and
 * do not remount dashboard chrome when switching sidebar items.
 */
export default function FleetLeasingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LeaseContractsProvider>{children}</LeaseContractsProvider>;
}
