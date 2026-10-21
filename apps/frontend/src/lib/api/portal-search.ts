import { apiFetch } from "./client";

export type PortalSearchLink = {
  rel: string;
  label: string;
  entityId?: string;
  display: string;
};

export type PortalSearchHit = {
  id: string;
  title: string;
  subtitle?: string;
  moduleKey: string;
  moduleLabel: string;
  entityType: string;
  entityTypeLabel: string;
  status?: string;
  routePath: string;
  routeQuery: Record<string, string>;
  links: PortalSearchLink[];
};

export type PortalSearchResponse = {
  query: string;
  items: PortalSearchHit[];
  meta: {
    totalReturned: number;
    limitPerType: number;
    capApplied: boolean;
    searchedModules: string[];
  };
};

export type PortalSearchParams = {
  organizationId: string;
  q: string;
  limitPerType?: number;
};

export function searchPortalApi(
  token: string,
  params: PortalSearchParams,
  organizationIdHeader?: string,
): Promise<PortalSearchResponse> {
  const search = new URLSearchParams();
  search.set("organizationId", params.organizationId);
  search.set("q", params.q);
  if (params.limitPerType != null) {
    search.set("limitPerType", String(params.limitPerType));
  }

  return apiFetch<PortalSearchResponse>(
    `/portal/search?${search.toString()}`,
    {
      token,
      headers: organizationIdHeader
        ? { "x-organization-id": organizationIdHeader }
        : undefined,
    },
  );
}
