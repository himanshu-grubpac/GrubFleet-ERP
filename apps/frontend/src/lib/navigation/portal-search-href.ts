import type { PortalSearchHit } from "@/lib/api/portal-search";

/** Static export: API routePath + routeQuery → in-app href. */
export function portalSearchHitHref(
  hit: Pick<PortalSearchHit, "routePath" | "routeQuery">,
): string {
  const routePath = hit.routePath?.trim() || "/dashboard/";
  const path = routePath.endsWith("/") ? routePath : `${routePath}/`;
  const params = new URLSearchParams(hit.routeQuery ?? {});
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
