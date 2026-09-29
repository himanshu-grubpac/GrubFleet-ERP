import {
  getCountryNameEn,
  isValidIso31661Alpha2Country,
  normalizeCountryCode,
} from "@grubpac/validation";
import type { CountryCode } from "libphonenumber-js";

import type { GeoCountryDefinition, GeoCountryOption } from "./types";

export const DEFAULT_COUNTRY_CODE = "IN";

function regionLabelForCountry(code: string): string {
  switch (code) {
    case "IN":
    case "US":
    case "AU":
    case "BR":
    case "MX":
      return "State";
    case "AE":
      return "Emirate";
    case "CA":
      return "Province";
    case "GB":
      return "County";
    default:
      return "State / Province / Region";
  }
}

function postalLabelForCountry(code: string): string {
  if (code === "IN") {
    return "Pincode";
  }
  if (code === "US") {
    return "ZIP code";
  }
  return "Postal code";
}

/** Subdivision field label for forms (State, Emirate, Province, …). */
export function getRegionLabel(code: string | null | undefined): string {
  const normalized = normalizeCountryCode(
    code?.trim() || DEFAULT_COUNTRY_CODE,
  );
  const resolved = isValidIso31661Alpha2Country(normalized)
    ? normalized
    : DEFAULT_COUNTRY_CODE;
  return regionLabelForCountry(resolved);
}

export function getCountryDefinition(
  code: string | null | undefined,
): GeoCountryDefinition {
  const normalized = normalizeCountryCode(
    code?.trim() || DEFAULT_COUNTRY_CODE,
  );
  const resolved = isValidIso31661Alpha2Country(normalized)
    ? normalized
    : DEFAULT_COUNTRY_CODE;
  const label =
    getCountryNameEn(resolved) ?? getCountryNameEn(DEFAULT_COUNTRY_CODE) ?? resolved;

  return {
    code: resolved,
    label,
    phoneDefaultCountry: resolved as CountryCode,
    regionLabel: regionLabelForCountry(resolved),
    postalLabel: postalLabelForCountry(resolved),
    showDistrict: true,
  };
}

export function getCountryLabel(code: string | null | undefined): string {
  return getCountryDefinition(code).label;
}

export function isKnownCountryCode(code: string): boolean {
  return isValidIso31661Alpha2Country(normalizeCountryCode(code));
}

let countriesCache: GeoCountryOption[] | null = null;
let countriesLoadPromise: Promise<GeoCountryOption[]> | null = null;

/** Loads all ISO countries from maintained dataset (cached; dynamic import). */
export async function loadAllCountries(): Promise<GeoCountryOption[]> {
  if (countriesCache) {
    return countriesCache;
  }
  if (!countriesLoadPromise) {
    countriesLoadPromise = (async () => {
      const { Country } = await import("country-state-city");
      const list = Country.getAllCountries()
        .map((country) => ({
          code: country.isoCode,
          label: country.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "en"));
      countriesCache = list;
      return list;
    })();
  }
  return countriesLoadPromise;
}
