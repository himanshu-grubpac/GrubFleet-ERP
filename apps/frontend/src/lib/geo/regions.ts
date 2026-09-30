import type { GeoRegion } from "./types";
import { normalizeCountryCode } from "@grubpac/validation";

const regionCache = new Map<string, GeoRegion[]>();

/** Lazy-load subdivisions for a country via maintained dataset (not bundled upfront). */
export async function loadRegionsForCountry(
  countryCode: string | null | undefined,
): Promise<GeoRegion[]> {
  const code = normalizeCountryCode(countryCode?.trim() ?? "");
  if (!code || code.length !== 2) {
    return [];
  }
  const cached = regionCache.get(code);
  if (cached) {
    return cached;
  }

  const { State } = await import("country-state-city");
  const regions = State.getStatesOfCountry(code).map((state) => ({
    code: state.isoCode,
    name: state.name,
  }));
  regionCache.set(code, regions);
  return regions;
}

export async function hasRegionCatalog(
  countryCode: string | null | undefined,
): Promise<boolean> {
  const regions = await loadRegionsForCountry(countryCode);
  return regions.length > 0;
}
