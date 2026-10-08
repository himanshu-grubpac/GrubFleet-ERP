"use client";

import { useSearchParams } from "next/navigation";
import type { FinanceEntityQueryKey } from "./finance-static-routes";

export function useFinanceEntityId(
  queryKey: FinanceEntityQueryKey,
): string | null {
  const params = useSearchParams();
  const raw = params.get(queryKey);
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}
