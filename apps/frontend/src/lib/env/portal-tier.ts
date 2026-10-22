/** Baked at build time per deploy tier (GHA deploy-label → NEXT_PUBLIC_PORTAL_TIER). */
export type PortalTierKey =
  | 'staging'
  | 'preprod'
  | 'fleetbeta'
  | 'production'
  | '';

const TIER_DISPLAY: Record<
  Exclude<PortalTierKey, '' | 'production'>,
  string
> = {
  staging: 'Staging',
  preprod: 'Pre-prod',
  fleetbeta: 'Fleet + beta',
};

export function getPortalTierKey(): PortalTierKey {
  const raw = process.env.NEXT_PUBLIC_PORTAL_TIER?.trim().toLowerCase() ?? '';
  if (
    raw === 'staging' ||
    raw === 'preprod' ||
    raw === 'fleetbeta' ||
    raw === 'production'
  ) {
    return raw;
  }
  return '';
}

/** Sidebar / login subtitle; hidden on production and when unset. */
export function getPortalTierDisplayLabel(): string | null {
  const key = getPortalTierKey();
  if (key === '' || key === 'production') {
    return null;
  }
  return TIER_DISPLAY[key];
}

/** Browser tab prefix, e.g. [STAGING] */
export function getPortalTierTitlePrefix(): string | null {
  const label = getPortalTierDisplayLabel();
  if (!label) {
    return null;
  }
  return `[${label.toUpperCase()}]`;
}

export function getPortalDocumentTitle(base = 'GrubPac ERP'): string {
  const prefix = getPortalTierTitlePrefix();
  return prefix ? `${prefix} ${base}` : base;
}
