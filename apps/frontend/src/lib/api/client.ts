import type { ApiErrorResponse } from '@grubpac/shared-types';

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:4000/api/v1';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ApiErrorResponse,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (init?.token) {
    headers.set('Authorization', `Bearer ${init.token}`);
  }

  const res = await fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let body: ApiErrorResponse | undefined;
    try {
      body = (await res.json()) as ApiErrorResponse;
    } catch {
      /* non-json error */
    }
    throw new ApiClientError(body?.message ?? res.statusText, res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function getApiBaseUrl(): string {
  return baseUrl;
}
