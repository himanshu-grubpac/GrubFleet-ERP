import type { APIRequestContext } from "@playwright/test";

/** Prefer 127.0.0.1 — Playwright request context may fail on IPv6 localhost. */
export const e2eApiBase =
  process.env.E2E_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:4000/api/v1";

export async function apiJson<T>(
  request: APIRequestContext,
  token: string,
  organizationId: string | undefined,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${e2eApiBase.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (organizationId) {
    headers["x-organization-id"] = organizationId;
  }
  const res = await request.fetch(url, {
    method,
    headers,
    data: body,
  });
  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed ${res.status()}: ${text}`);
  }
  return (await res.json()) as T;
}
