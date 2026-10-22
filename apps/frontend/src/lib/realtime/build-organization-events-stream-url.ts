const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:4000/api/v1";

export function buildOrganizationEventsStreamUrl(
  organizationId: string,
  accessToken: string,
): string {
  const url = new URL(`${apiBase}/events/stream`);
  url.searchParams.set("organizationId", organizationId);
  url.searchParams.set("access_token", accessToken);
  return url.toString();
}
