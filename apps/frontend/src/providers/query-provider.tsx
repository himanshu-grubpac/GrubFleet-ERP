'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/toast/show-toast';

function logQueryClientError(scope: 'query' | 'mutation', error: unknown): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  console.error(`[QueryClient ${scope}]`, getApiErrorMessage(error));
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => logQueryClientError('query', error),
        }),
        mutationCache: new MutationCache({
          onError: (error) => logQueryClientError('mutation', error),
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
