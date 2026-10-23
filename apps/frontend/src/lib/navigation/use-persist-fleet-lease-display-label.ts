"use client";

import { useEffect } from "react";

import { setEntityNavigationDisplayLabel } from "@/lib/navigation/secure-entity-navigation";

/** Keep session breadcrumb label in sync after contract detail loads. */
export function usePersistFleetLeaseDisplayLabel(
  leaseId: string,
  contractNumber: string | undefined | null,
): void {
  useEffect(() => {
    const id = leaseId.trim();
    const label = contractNumber?.trim();
    if (!id || !label) {
      return;
    }
    setEntityNavigationDisplayLabel("lease", id, label);
  }, [leaseId, contractNumber]);
}
