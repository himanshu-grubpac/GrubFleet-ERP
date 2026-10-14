"use client";

import { useParams, useSearchParams } from "next/navigation";

import type { WorkshopEntityQueryKey } from "./workshop-static-routes";

function readParamId(
  value: string | string[] | undefined,
): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && value[0]?.trim()) {
    return value[0].trim();
  }
  return "";
}

/** Resolve workshop entity id from static-export query param, with dynamic segment fallback for local dev. */
export function useWorkshopEntityId(
  queryKey: WorkshopEntityQueryKey,
): string {
  const searchParams = useSearchParams();
  const params = useParams();
  const fromQuery = searchParams.get(queryKey)?.trim() ?? "";
  if (fromQuery) {
    return fromQuery;
  }

  if (queryKey === "workOrderId") {
    return readParamId(params.id);
  }

  if (
    queryKey === "tierId" ||
    queryKey === "scheduleId" ||
    queryKey === "subscriberCode"
  ) {
    return readParamId(params.id);
  }

  return "";
}
