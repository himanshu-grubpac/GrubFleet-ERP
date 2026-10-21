import type { PortalSearchHit } from "@/lib/api/portal-search";

/** Static export: API routePath + routeQuery → in-app href. */
export function portalSearchHitHref(
  hit: Pick<PortalSearchHit, "routePath" | "routeQuery">,
): string {
  const path = hit.routePath.endsWith("/")
    ? hit.routePath
    : `${hit.routePath}/`;
  const params = new URLSearchParams(hit.routeQuery);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
