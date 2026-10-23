"use client";

import type { AssetRegisterEntityQueryKey } from "./asset-register-static-routes";
import { useSecureEntityId } from "./use-secure-entity-id";

/** Resolve asset register entity id from secure nav store (path-only static export shells). */
export function useAssetRegisterEntityId(
  queryKey: AssetRegisterEntityQueryKey,
): string {
  return useSecureEntityId({
    legacyQueryKey: queryKey,
    legacyRouteParamKey: "id",
  });
}
