"use client";

import type { FleetEntityQueryKey } from "./fleet-static-routes";
import { useSecureEntityId } from "./use-secure-entity-id";

/** Resolve fleet entity id from secure nav store (path-only static export shells). */
export function useFleetEntityId(queryKey: FleetEntityQueryKey): string {
  return useSecureEntityId({
    legacyQueryKey: queryKey,
    legacyRouteParamKey: "leaseId",
  });
}
