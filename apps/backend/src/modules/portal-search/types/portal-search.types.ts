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
