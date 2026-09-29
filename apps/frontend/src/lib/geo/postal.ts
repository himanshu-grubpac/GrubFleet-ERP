import type { RestrictedInputKind } from "@/lib/forms/restricted-input";
import {
  validatePostalForCountry,
  normalizeCountryCode,
} from "@grubpac/validation";
import { postcodeValidatorExistsForCountry } from "postcode-validator";

import { getCountryDefinition } from "./countries";

export function getPostalRestrictedKindForCountry(
  countryCode: string | null | undefined,
): RestrictedInputKind {
  const code = normalizeCountryCode(countryCode?.trim() ?? "");
  if (code === "IN") {
    return "pincode";
  }
  if (code === "US") {
    return "postalUs";
  }
  return "postalGeneric";
}

export function isValidPostalForCountry(
  countryCode: string | null | undefined,
  value: string,
): boolean {
  const code = normalizeCountryCode(
    countryCode?.trim() ?? getCountryDefinition(countryCode).code,
  );
  const result = validatePostalForCountry(code, value);
  return result.ok;
}

export function postalValidationMessage(
  countryCode: string | null | undefined,
): string {
  const code = normalizeCountryCode(countryCode?.trim() ?? "");
  if (postcodeValidatorExistsForCountry(code)) {
    return `Enter a valid ${getCountryDefinition(code).postalLabel.toLowerCase()} for this country.`;
  }
  return "Enter a valid postal code (letters, numbers, spaces, hyphens).";
}

export function postalRequiredMessage(
  countryCode: string | null | undefined,
): string {
  const label = getCountryDefinition(countryCode).postalLabel;
  return `${label} is required.`;
}

export function formatPostalDisplay(
  countryCode: string | null | undefined,
  postal: string | null | undefined,
): string | null {
  const trimmed = postal?.trim();
  if (!trimmed) {
    return null;
  }
  const code = normalizeCountryCode(countryCode?.trim() ?? "IN");
  if (code === "IN") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 6) {
      return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    }
  }
  if (code === "US") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 9) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
  }
  return trimmed;
}
