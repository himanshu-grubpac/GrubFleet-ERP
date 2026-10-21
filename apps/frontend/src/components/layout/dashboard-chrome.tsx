'use client';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/providers/auth-provider';

/**
 * Client dashboard chrome (sidebar + header + main). Kept separate from
 * `(dashboard)/layout.tsx` so the route segment layout stays a Server Component
 * and AppShell state survives client navigations within the dashboard tree.
 */
export function DashboardChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
