"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { fetchLeaseContractById } from "@/lib/api/lease-contracts";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  entityNavigationScopeFromPath,
  resolveEntityNavigationDisplayLabel,
  resolveSecureEntityId,
  setEntityNavigationDisplayLabel,
} from "@/lib/navigation/secure-entity-navigation";
import { useFleetEntityId } from "@/lib/navigation/use-fleet-entity-id";

function normalizePath(path: string): string {
  const normalized = path.split("?")[0].replace(/\/+$/, "");
  return normalized || "/";
}

/** Lease contract shells that show contract number in breadcrumbs. */
export function isFleetLeaseContractEntityPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return (
    path.endsWith("/lease-contracts/detail") ||
    path.endsWith("/lease-contracts/edit") ||
    path.endsWith("/lease-contracts/end-lease") ||
    path.endsWith("/lease-contracts/detail/change-history")
  );
}

export function useFleetLeaseBreadcrumbContext(): {
  leaseId: string;
  leaseContractLabel: string;
} {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { token, organizationId, isAuthenticated, isLoading: authLoading } =
    useAuth();

  const leaseIdFromHook = useFleetEntityId("leaseId");

  const leaseId = useMemo(() => {
    if (leaseIdFromHook.trim()) {
      return leaseIdFromHook.trim();
    }
    const scope = entityNavigationScopeFromPath(pathname);
    return resolveSecureEntityId(scope, {
      queryValue: searchParams.get("leaseId"),
    }).trim();
  }, [leaseIdFromHook, pathname, searchParams]);

  const storedLabel = useMemo(() => {
    if (!leaseId) {
      return "";
    }
    return resolveEntityNavigationDisplayLabel("lease", leaseId);
  }, [leaseId, pathname]);

  const cachedContractNumber = useMemo(() => {
    if (!leaseId || !organizationId) {
      return "";
    }
    const cached = queryClient.getQueryData<{ contractNumber?: string }>([
      "lease-contract",
      leaseId,
      organizationId,
    ]);
    return cached?.contractNumber?.trim() ?? "";
  }, [leaseId, organizationId, queryClient, storedLabel]);

  const resolvedFromCache = storedLabel || cachedContractNumber;

  const fetchQuery = useQuery({
    queryKey: ["lease-contract", leaseId, organizationId],
    queryFn: () =>
      fetchLeaseContractById(token ?? "", organizationId ?? "", leaseId),
    enabled:
      isAuthenticated &&
      !authLoading &&
      Boolean(token) &&
      Boolean(organizationId) &&
      Boolean(leaseId) &&
      isFleetLeaseContractEntityPath(pathname) &&
      !resolvedFromCache,
    ...dashboardListQueryOptions,
    staleTime: 5 * 60 * 1000,
  });

  const fromFetch = fetchQuery.data?.contractNumber?.trim() ?? "";

  const leaseContractLabel = resolvedFromCache || fromFetch;

  useEffect(() => {
    if (leaseId && fromFetch) {
      setEntityNavigationDisplayLabel("lease", leaseId, fromFetch);
    }
  }, [leaseId, fromFetch]);

  return { leaseId, leaseContractLabel };
}
