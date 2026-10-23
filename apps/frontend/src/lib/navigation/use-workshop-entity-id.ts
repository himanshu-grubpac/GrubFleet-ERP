"use client";

import type { WorkshopEntityQueryKey } from "./workshop-static-routes";
import { useSecureEntityId } from "./use-secure-entity-id";

/** Resolve workshop entity id from secure nav store (path-only static export shells). */
export function useWorkshopEntityId(
  queryKey: WorkshopEntityQueryKey,
): string {
  return useSecureEntityId({
    legacyQueryKey: queryKey,
    legacyRouteParamKey: "id",
  });
}
