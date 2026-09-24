'use client';

import { useQuery } from '@tanstack/react-query';
import { ErrorState, LoadingState } from '@/components/states/async-states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api/client';
import type { HealthLiveness } from '@grubpac/shared-types';

export default function DashboardPage() {
  const healthQuery = useQuery({
    queryKey: ['health', 'liveness'],
    queryFn: () => apiFetch<HealthLiveness>('/health'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-950">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Foundation shell — connect modules as backend APIs land.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>API connectivity</CardTitle>
          <CardDescription>
            Probes `{process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1'}/health`
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthQuery.isLoading ? <LoadingState label="Checking API…" /> : null}
          {healthQuery.isError ? (
            <ErrorState
              message="Backend unreachable or CORS misconfigured. Start docker-compose and the Nest app."
              onRetry={() => healthQuery.refetch()}
            />
          ) : null}
          {healthQuery.isSuccess ? (
            <p className="text-sm text-green-800">
              Backend liveness: <strong>{healthQuery.data.status}</strong> (
              {healthQuery.data.service})
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
