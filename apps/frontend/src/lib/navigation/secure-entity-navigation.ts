/**
 * Secure entity navigation — entity ids live in sessionStorage, not the URL bar.
 * Works with static export (path-only detail/edit shells on CloudFront).
 *
 * Tradeoffs: entity detail URLs are not shareable bookmarks; refresh works within TTL;
 * open in new tab without prior priming shows empty/guard state until user navigates from list.
 */

const STORAGE_VERSION = 1;
/** Session persistence for refresh/back within the same tab. */
const TTL_MS = 8 * 60 * 60 * 1000;

export type EntityNavigationScope = string;

export function entityNavigationScopeFromPath(pathname: string): EntityNavigationScope {
  const pathOnly = pathname.split("?")[0].split("#")[0];
  const normalized = pathOnly.replace(/\/+$/, "") || "/";
  return `v${STORAGE_VERSION}:path:${normalized}`;
}

type StoredPayload = { id: string; exp: number };

function storageKey(
  scope: EntityNavigationScope,
  kind: "pending" | "active",
): string {
  return `gf-erp-nav:${kind}:${scope}`;
}

function persistActive(scope: EntityNavigationScope, id: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const payload: StoredPayload = { id, exp: Date.now() + TTL_MS };
  try {
    sessionStorage.setItem(storageKey(scope, "active"), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

/** Call immediately before client navigation to a path-only entity shell. */
export function setPendingEntityNavigation(
  scope: EntityNavigationScope,
  id: string,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return;
  }
  const payload: StoredPayload = { id: trimmed, exp: Date.now() + TTL_MS };
  try {
    sessionStorage.setItem(storageKey(scope, "pending"), JSON.stringify(payload));
    persistActive(scope, trimmed);
  } catch {
    /* quota */
  }
}

export function prepareEntityNavigationForPath(pathname: string, id: string): void {
  setPendingEntityNavigation(entityNavigationScopeFromPath(pathname), id);
}

export function pathnameFromHref(href: string): string {
  const pathPart = href.split("#")[0];
  return pathPart.split("?")[0];
}

/** Resolve id for the current shell: pending → active session → migration sources. */
export function resolveSecureEntityId(
  scope: EntityNavigationScope,
  migration?: {
    queryValue?: string | null;
    routeParamValue?: string | null;
  },
): string {
  const fromMigration =
    migration?.queryValue?.trim() ||
    migration?.routeParamValue?.trim() ||
    "";

  if (typeof window !== "undefined") {
    try {
      const pendingRaw = sessionStorage.getItem(storageKey(scope, "pending"));
      if (pendingRaw) {
        sessionStorage.removeItem(storageKey(scope, "pending"));
        const pending = JSON.parse(pendingRaw) as StoredPayload;
        if (pending.id && pending.exp > Date.now()) {
          persistActive(scope, pending.id);
          return pending.id;
        }
      }

      const activeRaw = sessionStorage.getItem(storageKey(scope, "active"));
      if (activeRaw) {
        const active = JSON.parse(activeRaw) as StoredPayload;
        if (active.id && active.exp > Date.now()) {
          return active.id;
        }
        sessionStorage.removeItem(storageKey(scope, "active"));
      }
    } catch {
      /* corrupt storage */
    }
  }

  if (fromMigration) {
    if (typeof window !== "undefined") {
      persistActive(scope, fromMigration);
    }
    return fromMigration;
  }

  return "";
}

export const DEPRECATED_ENTITY_QUERY_KEYS = [
  "locationId",
  "supplierId",
  "employeeId",
  "clientId",
  "driverId",
  "leaseId",
  "invoiceId",
  "paymentId",
  "partId",
  "receiptId",
  "partsRequestId",
  "vehicleId",
  "assetClassId",
  "workOrderId",
  "tierId",
  "scheduleId",
  "subscriberCode",
  "laborJobCardId",
  "roleId",
] as const;

export type DeprecatedEntityQueryKey =
  (typeof DEPRECATED_ENTITY_QUERY_KEYS)[number];

/** Remove legacy id query params from the address bar after migration read. */
export function stripDeprecatedEntityQueryParams(
  keys: readonly string[],
): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed) {
    return;
  }
  const qs = url.searchParams.toString();
  const next = qs
    ? `${url.pathname}?${qs}${url.hash}`
    : `${url.pathname}${url.hash}`;
  window.history.replaceState(null, "", next);
}

type RouterNavigate = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

/** Prime session store then navigate — use instead of router.push(detailHref(id)). */
export function navigateToEntityShell(
  router: RouterNavigate,
  href: string,
  entityId: string,
  method: "push" | "replace" = "push",
): void {
  const trimmed = entityId.trim();
  if (trimmed) {
    prepareEntityNavigationForPath(pathnameFromHref(href), trimmed);
  }
  router[method](href);
}

/** Legacy `[id]` segment routes → path-only shell with store primed. */
export function legacyRedirectToEntityShell(
  router: RouterNavigate,
  targetHref: string,
  entityId: string,
  fallbackListHref: string,
): void {
  const trimmed = entityId.trim();
  if (!trimmed) {
    router.replace(fallbackListHref);
    return;
  }
  navigateToEntityShell(router, targetHref, trimmed, "replace");
}

export function appendQueryToPath(
  path: string,
  params: Record<string, string | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value?.trim();
    if (trimmed) {
      search.set(key, trimmed);
    }
  }
  const qs = search.toString();
  if (!qs) {
    return path;
  }
  const hashIndex = path.indexOf("#");
  if (hashIndex >= 0) {
    return `${path.slice(0, hashIndex)}?${qs}${path.slice(hashIndex)}`;
  }
  return `${path}?${qs}`;
}
