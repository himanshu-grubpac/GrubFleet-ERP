"use client";

import type { OrganisationEntityQueryKey } from "./organisation-static-routes";
import { useSecureEntityId } from "./use-secure-entity-id";

/** Resolve organisation entity id from secure nav store (path-only static export shells). */
export function useOrganisationEntityId(
  queryKey: OrganisationEntityQueryKey,
): string {
  return useSecureEntityId({
    legacyQueryKey: queryKey,
    legacyRouteParamKey: "id",
  });
}
