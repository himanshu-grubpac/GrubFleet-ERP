"use client";

import type { FinanceEntityQueryKey } from "./finance-static-routes";
import { useSecureEntityId } from "./use-secure-entity-id";

export function useFinanceEntityId(
  queryKey: FinanceEntityQueryKey,
): string | null {
  const id = useSecureEntityId({ legacyQueryKey: queryKey });
  return id ? id : null;
}
