import type { ApiErrorResponse } from "@grubpac/shared-types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:4000/api/v1";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ApiErrorResponse,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Refresh the access token using the stored refresh token.
 *
 * This intentionally uses fetch directly instead of apiFetch()
 * because /auth/refresh itself must not trigger another refresh.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const refreshToken =
      localStorage.getItem("refresh_token");

    if (!refreshToken) {
      return null;
    }

    const response = await fetch(
      `${baseUrl}/auth/refresh`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          refreshToken,
        }),
      },
    );

    if (!response.ok) {
      return null;
    }

    const tokenPair = await response.json();

    if (!tokenPair?.accessToken) {
      return null;
    }

    localStorage.setItem(
      "access_token",
      tokenPair.accessToken,
    );

    if (tokenPair.refreshToken) {
      localStorage.setItem(
        "refresh_token",
        tokenPair.refreshToken,
      );
    }

    return tokenPair.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & {
    token?: string;
  },
): Promise<T> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`
    }`;

  const makeRequest = async (
    accessToken?: string,
  ): Promise<Response> => {
    const headers = new Headers(init?.headers);

    headers.set("Accept", "application/json");

    if (
      init?.body &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json",
      );
    }

    if (accessToken) {
      headers.set(
        "Authorization",
        `Bearer ${accessToken}`,
      );
    }

    return fetch(url, {
      ...init,
      headers,
      credentials: "include",
    });
  };

  /*
   * First request
   */
  let accessToken = init?.token;

  let res = await makeRequest(accessToken);

  /*
   * If the access token expired, refresh it once
   * and retry the original request.
   */
  if (
    res.status === 401 &&
    accessToken &&
    !path.includes("/auth/refresh")
  ) {
    const refreshedToken =
      await refreshAccessToken();

    if (refreshedToken) {
      accessToken = refreshedToken;

      res = await makeRequest(
        refreshedToken,
      );
    }
  }

  /*
   * Still unsuccessful after retry.
   */
  if (!res.ok) {
    let body: ApiErrorResponse | undefined;

    try {
      body =
        (await res.json()) as ApiErrorResponse;
    } catch {
      /* non-json error */
    }

    throw new ApiClientError(
      body?.message ?? res.statusText,
      res.status,
      body,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function getApiBaseUrl(): string {
  return baseUrl;
}