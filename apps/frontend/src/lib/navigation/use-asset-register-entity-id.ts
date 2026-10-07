"use client";

import { useParams, useSearchParams } from "next/navigation";

import type { AssetRegisterEntityQueryKey } from "./asset-register-static-routes";

/** Resolve entity id from static-export query param, with dynamic `[id]` fallback for local dev. */
export function useAssetRegisterEntityId(
  queryKey: AssetRegisterEntityQueryKey,
): string {
  const searchParams = useSearchParams();
  const params = useParams();
  const fromQuery = searchParams.get(queryKey)?.trim() ?? "";
  if (fromQuery) {
    return fromQuery;
  }
  const fromParam = params.id;
  if (typeof fromParam === "string" && fromParam.trim()) {
    return fromParam.trim();
  }
  if (Array.isArray(fromParam) && fromParam[0]?.trim()) {
    return fromParam[0].trim();
  }
  return "";
}
