"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";

import {
  entityNavigationScopeFromPath,
  resolveSecureEntityId,
  stripDeprecatedEntityQueryParams,
  type DeprecatedEntityQueryKey,
} from "./secure-entity-navigation";

type UseSecureEntityIdOptions = {
  /** Legacy query param name (stripped from URL after read). */
  legacyQueryKey?: DeprecatedEntityQueryKey;
  /** Dynamic route segment fallback (local dev / legacy `[id]`). */
  legacyRouteParamKey?: "id" | "leaseId";
};

/**
 * Resolve entity id for the current path-only shell from secure navigation store,
 * with one release of deprecated query / dynamic segment migration.
 */
export function useSecureEntityId(options: UseSecureEntityIdOptions = {}): string {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const params = useParams();

  const scope = useMemo(
    () => entityNavigationScopeFromPath(pathname),
    [pathname],
  );

  const legacyQueryValue = options.legacyQueryKey
    ? searchParams.get(options.legacyQueryKey)
    : null;

  let legacyRouteParamValue: string | null = null;
  if (options.legacyRouteParamKey) {
    const raw = params[options.legacyRouteParamKey];
    if (typeof raw === "string") {
      legacyRouteParamValue = raw;
    } else if (Array.isArray(raw) && raw[0]) {
      legacyRouteParamValue = raw[0];
    }
  }

  const [entityId, setEntityId] = useState("");

  useEffect(() => {
    const resolved = resolveSecureEntityId(scope, {
      queryValue: legacyQueryValue,
      routeParamValue: legacyRouteParamValue,
    });
    setEntityId(resolved);

    if (options.legacyQueryKey && legacyQueryValue?.trim()) {
      stripDeprecatedEntityQueryParams([options.legacyQueryKey]);
    }
  }, [
    scope,
    legacyQueryValue,
    legacyRouteParamValue,
    options.legacyQueryKey,
  ]);

  return entityId;
}
