import {
  getExampleNumber,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";
import { normalizeCountryCode } from "@grubpac/validation";

import { formatPhoneDisplay } from "@/lib/format/phone-format";

import {
  DEFAULT_COUNTRY_CODE,
  getCountryDefinition,
  getRegionLabel,
} from "./countries";

export { getRegionLabel };

/** Example postal strings for common markets; generic fallback for others. */
const POSTAL_PLACEHOLDER_BY_COUNTRY: Record<string, string> = {
  IN: "110 001",
  US: "10001",
  AE: "00000",
  GB: "SW1A 1AA",
  CA: "K1A 0B1",
  AU: "2000",
  DE: "10115",
  FR: "75001",
  SG: "018956",
};

const GENERIC_PHONE_PLACEHOLDER = "+1 201 555 0123";
const GENERIC_POSTAL_PLACEHOLDER = "12345";

/** Person / employee mobile — not tied to site address country. */
export function getInternationalPhonePlaceholder(): string {
  return GENERIC_PHONE_PLACEHOLDER;
}

function resolveCountryCode(
  countryCode: string | null | undefined,
): CountryCode {
  const def = getCountryDefinition(countryCode);
  return def.phoneDefaultCountry;
}

/**
 * International-format example for empty phone fields (libphonenumber mobile examples).
 */
export function getPhonePlaceholder(
  countryCode: string | null | undefined,
): string {
  const code = resolveCountryCode(countryCode);
  const example = getExampleNumber(code, examples);
  if (example) {
    const international = example.formatInternational();
    return formatPhoneDisplay(international, code) || international;
  }
  if (code === "IN") {
    return "+91 98765 43210";
  }
  return GENERIC_PHONE_PLACEHOLDER;
}

/**
 * Hint text for postal / pincode / ZIP fields — not the field label.
 */
export function getPostalPlaceholder(
  countryCode: string | null | undefined,
): string {
  const normalized = normalizeCountryCode(
    countryCode?.trim() || DEFAULT_COUNTRY_CODE,
  );
  const specific = POSTAL_PLACEHOLDER_BY_COUNTRY[normalized];
  if (specific) {
    return specific;
  }
  const label = getCountryDefinition(normalized).postalLabel;
  return `${label} (e.g. ${GENERIC_POSTAL_PLACEHOLDER})`;
}
