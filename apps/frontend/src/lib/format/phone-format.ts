import {
  AsYouType,
  type CountryCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

import {
  ORG_INPUT_LIMITS,
  ORG_PHONE_MAX_DIGITS,
  compactPhoneSignificant,
} from "@/lib/forms/restricted-input";

/** Organisation DTO @MaxLength(32) — normalize API payloads to this cap. */
export const ORG_PHONE_STORAGE_MAX = ORG_INPUT_LIMITS.phone;

/**
 * Display + clipboard standard: international format with spaces (e.g. +91 98765 43210).
 * API storage: compact E.164 when parseable (+919876543210), else digits/+ only, max 32.
 */

function trimmedOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function truncatePhone(value: string): string {
  if (value.length <= ORG_PHONE_STORAGE_MAX) {
    return value;
  }
  return value.slice(0, ORG_PHONE_STORAGE_MAX);
}

function parseOrgPhone(
  value: string,
  defaultCountry?: CountryCode,
): ReturnType<typeof parsePhoneNumberFromString> {
  const trimmed = trimmedOrEmpty(value);
  if (!trimmed) {
    return undefined;
  }

  const direct =
    defaultCountry !== undefined
      ? parsePhoneNumberFromString(trimmed, defaultCountry)
      : parsePhoneNumberFromString(trimmed);
  if (direct) {
    return direct;
  }

  if (!trimmed.startsWith("+")) {
    if (defaultCountry !== undefined) {
      const national = parsePhoneNumberFromString(trimmed, defaultCountry);
      if (national) {
        return national;
      }
      const digitsOnly = trimmed.replace(/\D/g, "");
      if (digitsOnly) {
        return parsePhoneNumberFromString(`+${digitsOnly}`, defaultCountry);
      }
    }
  }

  return undefined;
}

/** UI labels, detail fields, table tooltips. */
export function formatPhoneDisplay(
  value: string | null | undefined,
  defaultCountry?: CountryCode,
): string {
  const trimmed = trimmedOrEmpty(value);
  if (!trimmed) {
    return "";
  }

  const parsed = parseOrgPhone(trimmed, defaultCountry);
  if (parsed) {
    return parsed.formatInternational();
  }

  return trimmed;
}

/** Clipboard + row copy blocks — same as display for consistency. */
export function formatPhoneForCopy(
  value: string | null | undefined,
  defaultCountry?: CountryCode,
): string {
  return formatPhoneDisplay(value, defaultCountry);
}

/**
 * Submit to API: prefer valid E.164 (fits 32 chars for all standard numbers).
 * Unparseable input is compacted to + and digits only so backend @MaxLength still passes.
 */
export function normalizePhoneForApi(
  value: string | null | undefined,
  defaultCountry?: CountryCode,
): string {
  const trimmed = trimmedOrEmpty(value);
  if (!trimmed) {
    return "";
  }

  const parsed = parseOrgPhone(trimmed, defaultCountry);
  if (parsed) {
    return truncatePhone(parsed.format("E.164"));
  }

  let compact = "";
  for (const char of trimmed) {
    if (char >= "0" && char <= "9") {
      compact += char;
      continue;
    }
    if (char === "+" && compact.length === 0) {
      compact += char;
    }
  }

  return truncatePhone(compact);
}

/**
 * Light format-as-you-type for RestrictedInput / paste-friendly international entry.
 * Does not reject valid partial numbers; falls back to sanitized raw when unknown.
 */
export function formatPhoneInputValue(
  value: string,
  defaultCountry?: CountryCode,
): string {
  const trimmed = trimmedOrEmpty(value);
  if (!trimmed) {
    return "";
  }

  const compact = compactPhoneSignificant(trimmed, ORG_PHONE_MAX_DIGITS);
  if (!compact) {
    return "";
  }

  const formatter =
    defaultCountry !== undefined
      ? new AsYouType(defaultCountry)
      : new AsYouType();
  const formatted = formatter.input(compact);
  return truncatePhone(formatted || compact);
}

/** Blur handler: snap to international display when the number is parseable. */
export function formatPhoneOnBlur(
  value: string | null | undefined,
  defaultCountry?: CountryCode,
): string {
  const trimmed = trimmedOrEmpty(value);
  if (!trimmed) {
    return "";
  }

  const parsed = parseOrgPhone(trimmed, defaultCountry);
  if (parsed) {
    return truncatePhone(parsed.formatInternational());
  }

  return truncatePhone(trimmed);
}

export function isPhoneValueEmpty(value: string | null | undefined): boolean {
  return trimmedOrEmpty(value).length === 0;
}
