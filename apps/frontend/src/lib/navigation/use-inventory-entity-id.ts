"use client";

import type { InventoryEntityQueryKey } from "./inventory-static-routes";
import { useSecureEntityId } from "./use-secure-entity-id";

/** Resolve inventory entity id from secure nav store (path-only static export shells). */
export function useInventoryEntityId(
  queryKey: InventoryEntityQueryKey,
): string {
  return useSecureEntityId({
    legacyQueryKey: queryKey,
    legacyRouteParamKey: "id",
  });
}
