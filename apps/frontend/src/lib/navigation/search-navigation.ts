import type { PortalSearchHit } from "@/lib/api/portal-search";
import { assetRegisterAssetClassDetailHref, assetRegisterFleetDetailHref } from "@/lib/navigation/asset-register-static-routes";
import { financeInvoiceDetailHref } from "@/lib/navigation/finance-static-routes";
import { fleetLeaseContractDetailHref } from "@/lib/navigation/fleet-static-routes";
import { inventoryStockRegisterDetailHref } from "@/lib/navigation/inventory-static-routes";
import {
  organisationClientDetailHref,
  organisationDriverDetailHref,
  organisationEmployeeDetailHref,
  organisationLocationDetailHref,
  organisationSupplierDetailHref,
} from "@/lib/navigation/organisation-static-routes";
import {
  workshopLabourRateCardDetailHref,
  workshopWorkOrderDetailHref,
} from "@/lib/navigation/workshop-static-routes";
import { internalHref } from "@/lib/navigation/nav-path-match";
import {
  DEPRECATED_ENTITY_QUERY_KEYS,
  pathnameFromHref,
  prepareEntityNavigationForPath,
} from "@/lib/navigation/secure-entity-navigation";

/** Query param appended when navigating from global search (highlight on destination). */
export const PORTAL_SEARCH_HIGHLIGHT_PARAM = "highlight";

const HIGHLIGHT_MAX_LENGTH = 120;

/** Normalize user/search text for highlight matching (bounded, no control chars). */
export function normalizePortalSearchHighlightTerm(
  raw: string | null | undefined,
): string | null {
  if (raw == null) {
    return null;
  }
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > HIGHLIGHT_MAX_LENGTH) {
    return trimmed.slice(0, HIGHLIGHT_MAX_LENGTH);
  }
  return trimmed;
}

function appendHighlightToHref(baseHref: string, highlightTerm: string | null): string {
  const term = normalizePortalSearchHighlightTerm(highlightTerm);
  if (!term) {
    return baseHref;
  }

  const hashIndex = baseHref.indexOf("#");
  const hash = hashIndex >= 0 ? baseHref.slice(hashIndex) : "";
  const beforeHash = hashIndex >= 0 ? baseHref.slice(0, hashIndex) : baseHref;

  const queryIndex = beforeHash.indexOf("?");
  const pathname =
    queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const existingQuery =
    queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : "";

  const params = new URLSearchParams(existingQuery);
  params.set(PORTAL_SEARCH_HIGHLIGHT_PARAM, term);
  const qs = params.toString();
  return `${pathname}?${qs}${hash}`;
}

/**
 * Map API hit to canonical static-export detail href (ignores stale/wrong routePath from API).
 */
export function portalSearchEntityDetailHref(
  hit: Pick<PortalSearchHit, "id" | "moduleKey" | "entityType" | "routePath" | "routeQuery">,
): string {
  const id = hit.id?.trim();
  if (!id) {
    return legacyRoutePathHref(hit);
  }

  switch (hit.moduleKey) {
    case "organisation":
      switch (hit.entityType) {
        case "employee":
          return organisationEmployeeDetailHref(id);
        case "location":
          return organisationLocationDetailHref(id);
        case "supplier":
          return organisationSupplierDetailHref(id);
        case "client":
          return organisationClientDetailHref(id);
        case "driver":
          return organisationDriverDetailHref(id);
        default:
          break;
      }
      break;
    case "fleet_leasing":
      if (hit.entityType === "lease_contract") {
        return fleetLeaseContractDetailHref(id);
      }
      break;
    case "asset_register":
      if (hit.entityType === "asset_class") {
        return assetRegisterAssetClassDetailHref(id);
      }
      if (hit.entityType === "fleet_vehicle") {
        return assetRegisterFleetDetailHref(id);
      }
      break;
    case "finance":
      if (hit.entityType === "invoice") {
        return financeInvoiceDetailHref(id);
      }
      break;
    case "inventory":
      if (hit.entityType === "spare_part") {
        return inventoryStockRegisterDetailHref(id);
      }
      break;
    case "workshop":
      if (hit.entityType === "work_order") {
        return workshopWorkOrderDetailHref(id);
      }
      if (hit.entityType === "labor_job_card") {
        return workshopLabourRateCardDetailHref(id);
      }
      break;
    default:
      break;
  }

  return legacyRoutePathHref(hit);
}

function legacyRoutePathHref(
  hit: Pick<PortalSearchHit, "routePath" | "routeQuery">,
): string {
  const routePath = hit.routePath?.trim() || "/dashboard/";
  const path = routePath.endsWith("/") ? routePath : `${routePath}/`;
  const params = new URLSearchParams(hit.routeQuery ?? {});
  for (const key of DEPRECATED_ENTITY_QUERY_KEYS) {
    params.delete(key);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Prime secure nav store before router.push from global search. */
export function primePortalSearchNavigation(
  hit: Pick<
    PortalSearchHit,
    "id" | "moduleKey" | "entityType" | "routePath" | "routeQuery"
  >,
): void {
  const id = hit.id?.trim();
  if (!id) {
    return;
  }
  const href = portalSearchEntityDetailHref(hit);
  prepareEntityNavigationForPath(pathnameFromHref(href), id);
}

/** Global search result → in-app href with optional highlight query param. */
export function portalSearchHitHref(
  hit: Pick<
    PortalSearchHit,
    "id" | "moduleKey" | "entityType" | "routePath" | "routeQuery"
  >,
  highlightTerm?: string | null,
): string {
  const base = portalSearchEntityDetailHref(hit);
  const withHighlight = appendHighlightToHref(base, highlightTerm ?? null);
  return internalHref(withHighlight);
}
