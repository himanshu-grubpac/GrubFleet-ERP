'use client';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/providers/auth-provider';

export default function DashboardGroupLayout({
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
