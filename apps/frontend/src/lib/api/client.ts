
import type { ApiErrorResponse } from "@grubpac/shared-types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:4000/api/v1";

type ApiFetchOptions = RequestInit & {
  token?: string;
};

interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export class ApiClientError extends Error {
  readonly code?: string;
  readonly correlationId?: string;
  readonly details?: unknown;
  readonly body?: ApiErrorResponse;

  constructor(
    message: string,
    public readonly status: number,
    body?: ApiErrorResponse,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.body = body;
    this.code = body?.code;
    this.correlationId = body?.correlationId;
    this.details = body?.details;
  }
}

/**
 * A shared refresh promise prevents multiple API requests from
 * refreshing the same session simultaneously.
 */
let refreshInFlight: Promise<string | null> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function notifyTokensRefreshed(accessToken: string): void {
  if (!isBrowser()) return;

  window.dispatchEvent(
    new CustomEvent("auth:tokens-refreshed", {
      detail: { accessToken },
    }),
  );
}

function notifySessionExpired(): void {
  if (!isBrowser()) return;

  window.dispatchEvent(new Event("auth:session-expired"));
}

/** Clears stored tokens and notifies the auth provider (password change, revoked refresh, stale JWT). */
export function invalidateLocalSession(): void {
  clearStoredTokens();
  notifySessionExpired();
}

function clearStoredTokens(): void {
  if (!isBrowser()) return;

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

/**
 * Refreshes the current session using the stored refresh token.
 *
 * Uses fetch directly so the refresh request cannot recursively
 * trigger another refresh through apiFetch().
 */
async function refreshAccessToken(): Promise<string | null> {
  if (!isBrowser()) return null;

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      clearStoredTokens();
      notifySessionExpired();
      return null;
    }

    let response: Response;

    try {
      response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // A network failure does not necessarily mean the session expired.
      // Preserve stored tokens so a later request can retry.
      return null;
    }

    if (!response.ok) {
      // The server rejected the refresh request. The current session
      // can no longer be refreshed using the stored refresh token.
      clearStoredTokens();
      notifySessionExpired();
      return null;
    }

    let tokens: AuthTokenPair;

    try {
      tokens = (await response.json()) as AuthTokenPair;
    } catch {
      // A successful response without valid JSON cannot provide new tokens.
      return null;
    }

    if (!tokens.accessToken || !tokens.refreshToken) {
      return null;
    }

    // Save both tokens because the backend may rotate the refresh token.
    localStorage.setItem("access_token", tokens.accessToken);
    localStorage.setItem("refresh_token", tokens.refreshToken);

    // Keep the React auth provider synchronized with the new access token.
    notifyTokensRefreshed(tokens.accessToken);

    return tokens.accessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Sends one HTTP request.
 *
 * The token argument overrides the token supplied in init.
 * Existing headers, request bodies, credentials and methods are preserved.
 */
async function sendRequest(
  path: string,
  init: ApiFetchOptions,
  token?: string,
): Promise<Response> {
  const requestInit: ApiFetchOptions = { ...init };
  delete requestInit.token;

  const headers = new Headers(requestInit.headers);

  headers.set("Accept", "application/json");

  if (
    requestInit.body != null &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.delete("Authorization");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return fetch(`${baseUrl}${normalizedPath}`, {
    ...requestInit,
    headers,
    credentials: "include",
  });
}

/**
 * Converts a failed HTTP response into the existing API error type.
 */
function parseApiErrorBody(raw: unknown): ApiErrorResponse | undefined {
  if (raw === null || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  if (
    typeof record.message === "string" &&
    typeof record.code === "string" &&
    typeof record.statusCode === "number"
  ) {
    return record as ApiErrorResponse;
  }
  const nested = record.error;
  if (nested !== null && typeof nested === "object") {
    return parseApiErrorBody(nested);
  }
  return undefined;
}

async function throwApiError(response: Response): Promise<never> {
  let body: ApiErrorResponse | undefined;

  try {
    body = parseApiErrorBody(await response.json());
  } catch {
    // Some responses have no JSON body.
  }

  const message =
    body?.message?.trim() ||
    response.statusText ||
    `Request failed (${response.status})`;

  if (process.env.NODE_ENV === "development") {
    console.error(
      `[apiFetch] ${response.status} ${message}`,
      body?.code,
      body?.correlationId,
    );
  }

  throw new ApiClientError(message, response.status, body);
}

/**
 * Shared API request function.
 *
 * Behavior:
 * 1. Sends the original request.
 * 2. If it receives 401 and has an access token, checks whether
 *    another request has already refreshed that token.
 * 3. Otherwise, refreshes the session once.
 * 4. Retries the original request once using the latest access token.
 * 5. Throws ApiClientError if the request still fails.
 *
 * Existing callers can continue using apiFetch(path, init).
 */
export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions,
): Promise<T> {
  const options = init ?? {};
  const originalToken = options.token;

  let response = await sendRequest(path, options, originalToken);

  if (response.status === 401 && originalToken) {
    // Another request may have refreshed the token while this request
    // was in flight. Reuse that newer token instead of refreshing again.
    let latestToken = isBrowser()
      ? localStorage.getItem("access_token")
      : null;

    if (!latestToken || latestToken === originalToken) {
      latestToken = await refreshAccessToken();
    }

    if (latestToken) {
      // Retry exactly once. A second 401 is returned as an API error.
      response = await sendRequest(path, options, latestToken);
    } else {
      invalidateLocalSession();
    }
  }

  if (!response.ok) {
    await throwApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl(): string {
  return baseUrl;
}
