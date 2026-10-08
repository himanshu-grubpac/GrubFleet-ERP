"use client";

import { useParams, useSearchParams } from "next/navigation";

import type { FleetEntityQueryKey } from "./fleet-static-routes";

/** Resolve fleet entity id from static-export query param, with dynamic segment fallback for local dev. */
export function useFleetEntityId(queryKey: FleetEntityQueryKey): string {
  const searchParams = useSearchParams();
  const params = useParams();
  const fromQuery = searchParams.get(queryKey)?.trim() ?? "";
  if (fromQuery) {
    return fromQuery;
  }
  const fromLeaseParam = params.leaseId;
  if (typeof fromLeaseParam === "string" && fromLeaseParam.trim()) {
    return fromLeaseParam.trim();
  }
  if (Array.isArray(fromLeaseParam) && fromLeaseParam[0]?.trim()) {
    return fromLeaseParam[0].trim();
  }
  return "";
}
