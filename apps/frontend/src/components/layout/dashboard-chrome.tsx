'use client';

import { AppShell } from '@/components/layout/app-shell';
import { useOrganizationRealtimeSync } from '@/lib/realtime/use-organization-realtime-sync';
import { ProtectedRoute } from '@/providers/auth-provider';

/**
 * Client dashboard chrome (sidebar + header + main). Kept separate from
 * `(dashboard)/layout.tsx` so the route segment layout stays a Server Component
 * and AppShell state survives client navigations within the dashboard tree.
 */
function DashboardRealtimeSync() {
  useOrganizationRealtimeSync();
  return null;
}

export function DashboardChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardRealtimeSync />
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
