import type { InputHTMLAttributes, KeyboardEvent } from "react";

/**
 * Shared input sanitization aligned with organisation backend DTO @MaxLength values.
 * Use via `RestrictedInput` or `sanitizeRestrictedInputValue` in controlled handlers.
 *
 * New ERP forms should use `RestrictedInput` (or re-export from `@/components/ui/input`)
 * instead of raw `<input>` for typed fields so typing, paste, and maxLength stay consistent.
 */

export const ORG_INPUT_LIMITS = {
  locationName: 255,
  locationTypeName: 120,
  addressLine: 255,
  addressRegion: 120,
  pincode: 6,
  postalUs: 10,
  postalGeneric: 20,
  /** Matches backend @MaxLength(32) on phone fields (E.164 storage). */
  phone: 32,
  email: 320,
  employeeFullName: 255,
  designation: 255,
  department: 120,
} as const;

/** Organisation suppliers — mirrors backend CreateSupplierDto @MaxLength. */
export const ORGANISATION_SUPPLIER_INPUT_LIMITS = {
  name: 255,
  contactPerson: 255,
  agreementReference: 120,
  phone: ORG_INPUT_LIMITS.phone,
  email: ORG_INPUT_LIMITS.email,
  addressLine: ORG_INPUT_LIMITS.addressLine,
  addressRegion: ORG_INPUT_LIMITS.addressRegion,
  addressPincode: ORG_INPUT_LIMITS.postalGeneric,
} as const;

/** Organisation driver register — mirrors backend CreateDriverDto @MaxLength. */
export const DRIVER_INPUT_LIMITS = {
  name: ORG_INPUT_LIMITS.employeeFullName,
  cprNo: 20,
  phone: ORG_INPUT_LIMITS.phone,
  email: ORG_INPUT_LIMITS.email,
  licenseNumber: 64,
  addressLine: ORG_INPUT_LIMITS.addressLine,
  addressRegion: ORG_INPUT_LIMITS.addressRegion,
  addressPincode: ORG_INPUT_LIMITS.postalGeneric,
  vehicleCode: 64,
  assetClass: ORG_INPUT_LIMITS.locationName,
  activeLeaseId: 64,
} as const;

/** Organisation client register — mirrors CreateOrganisationClientDto limits. */
export const ORGANISATION_CLIENT_INPUT_LIMITS = {
  clientName: 255,
  pocName: 255,
  pocEmail: ORG_INPUT_LIMITS.email,
  pocPhone: ORG_INPUT_LIMITS.phone,
  addressLine: ORG_INPUT_LIMITS.addressLine,
  addressRegion: ORG_INPUT_LIMITS.addressRegion,
  addressPincode: ORG_INPUT_LIMITS.postalGeneric,
} as const;

/** Fleet client register — mirrors backend CreateFleetClientDto @MaxLength. */
export const FLEET_CLIENT_INPUT_LIMITS = {
  companyName: 255,
  taxId: 32,
  pocName: 255,
  pocEmail: ORG_INPUT_LIMITS.email,
  pocPhone: ORG_INPUT_LIMITS.phone,
} as const;

/** Lease contract terms wizard — numeric money/term caps (UX; API stores deposit/rate as string). */
export const FLEET_LEASE_TERMS_INPUT_LIMITS = {
  termMonthsMaxDigits: 3,
  moneyMaxDigits: 12,
} as const;

/** ITU E.164 maximum significant digits (excludes leading +). */
export const ORG_PHONE_MAX_DIGITS = 15;

export type RestrictedInputKind =
  | "text"
  | "name"
  | "digits"
  | "pincode"
  | "postalUs"
  | "postalGeneric"
  | "phone"
  | "email";

export type SanitizeRestrictedInputOptions = {
  maxLength?: number;
};

const DEFAULT_MAX: Record<RestrictedInputKind, number | undefined> = {
  text: undefined,
  name: ORG_INPUT_LIMITS.employeeFullName,
  digits: undefined,
  pincode: ORG_INPUT_LIMITS.pincode,
  postalUs: ORG_INPUT_LIMITS.postalUs,
  postalGeneric: ORG_INPUT_LIMITS.postalGeneric,
  phone: ORG_INPUT_LIMITS.phone,
  email: ORG_INPUT_LIMITS.email,
};

function truncate(value: string, maxLength?: number): string {
  if (maxLength === undefined || value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
}

/** Free text / address lines — trim leading whitespace while typing. */
export function sanitizeTextValue(
  value: string,
  maxLength?: number,
): string {
  const withoutLeading = value.replace(/^\s+/, "");
  return truncate(withoutLeading, maxLength);
}

/** Person or place names — same as text with default name max when used via kind. */
export function sanitizeNameValue(
  value: string,
  maxLength: number = ORG_INPUT_LIMITS.employeeFullName,
): string {
  return sanitizeTextValue(value, maxLength);
}

export function sanitizeDigitsValue(
  value: string,
  maxLength?: number,
): string {
  return truncate(value.replace(/\D/g, ""), maxLength);
}

/** Alias for numeric-only fields (digits, optional max length). */
export const restrictNumericInput = sanitizeDigitsValue;

export function sanitizePincodeValue(value: string): string {
  return sanitizeDigitsValue(value, ORG_INPUT_LIMITS.pincode);
}

/** US ZIP — up to 5 digits or ZIP+4 (12345-6789). */
export function sanitizePostalUsValue(value: string): string {
  let out = "";
  let digitCount = 0;
  for (const char of value) {
    if (char >= "0" && char <= "9") {
      if (digitCount >= 9) {
        continue;
      }
      out += char;
      digitCount += 1;
      continue;
    }
    if (char === "-" && digitCount === 5 && !out.includes("-")) {
      out += "-";
    }
  }
  return truncate(out, ORG_INPUT_LIMITS.postalUs);
}

const POSTAL_GENERIC_ALLOWED = /[A-Za-z0-9\s-]/;

export function sanitizePostalGenericValue(value: string): string {
  let out = "";
  for (const char of value) {
    if (out.length >= ORG_INPUT_LIMITS.postalGeneric) {
      break;
    }
    if (POSTAL_GENERIC_ALLOWED.test(char)) {
      out += char;
    }
  }
  return out;
}

export function countPhoneDigits(value: string): number {
  let count = 0;
  for (const char of value) {
    if (char >= "0" && char <= "9") {
      count += 1;
    }
  }
  return count;
}

/**
 * Significant phone characters only: optional leading + and up to 15 digits.
 * Display formatting (spaces) is applied afterward in `formatPhoneInputValue`.
 */
export function compactPhoneSignificant(
  value: string,
  maxDigits: number = ORG_PHONE_MAX_DIGITS,
): string {
  let out = "";
  let digitCount = 0;
  for (const char of value) {
    if (char >= "0" && char <= "9") {
      if (digitCount >= maxDigits) {
        continue;
      }
      out += char;
      digitCount += 1;
      continue;
    }
    if (char === "+" && out.length === 0) {
      out += char;
    }
  }
  return out;
}

export function sanitizePhoneValue(value: string): string {
  return compactPhoneSignificant(value);
}

const EMAIL_ALLOWED = /[a-zA-Z0-9._%+\-@]/;

/** Strip whitespace and characters invalid in typical email local/domain parts. */
export function sanitizeEmailValue(
  value: string,
  maxLength: number = ORG_INPUT_LIMITS.email,
): string {
  let out = "";
  for (const char of value) {
    if (out.length >= maxLength) {
      break;
    }
    if (EMAIL_ALLOWED.test(char)) {
      out += char;
    }
  }
  return out;
}

export function sanitizeRestrictedInputValue(
  kind: RestrictedInputKind,
  value: string,
  options: SanitizeRestrictedInputOptions = {},
): string {
  const maxLength = options.maxLength ?? DEFAULT_MAX[kind];

  switch (kind) {
    case "text":
      return sanitizeTextValue(value, maxLength);
    case "name":
      return sanitizeNameValue(
        value,
        maxLength ?? ORG_INPUT_LIMITS.employeeFullName,
      );
    case "digits":
      return sanitizeDigitsValue(value, maxLength);
    case "pincode":
      return sanitizePincodeValue(value);
    case "postalUs":
      return sanitizePostalUsValue(value);
    case "postalGeneric":
      return sanitizePostalGenericValue(value);
    case "phone":
      return sanitizePhoneValue(value);
    case "email":
      return sanitizeEmailValue(
        value,
        maxLength ?? ORG_INPUT_LIMITS.email,
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const CONTROL_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

function isModifierCombo(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

/** Block printable keys that would be stripped on the next change event. */
export type ShouldBlockRestrictedInputOptions = {
  maxLength?: number;
};

export function shouldBlockKeyForRestrictedInput(
  kind: RestrictedInputKind,
  event: KeyboardEvent<HTMLInputElement>,
  options: ShouldBlockRestrictedInputOptions = {},
): boolean {
  if (isModifierCombo(event) || CONTROL_KEYS.has(event.key)) {
    return false;
  }
  if (event.key.length !== 1) {
    return false;
  }

  const char = event.key;
  const input = event.currentTarget;
  const { selectionStart, selectionEnd, value } = input;
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? value.length;

  switch (kind) {
    case "digits":
    case "pincode":
      return !/^\d$/.test(char);
    case "postalUs": {
      if (/^\d$/.test(char)) {
        return false;
      }
      if (char === "-") {
        const digits = countPhoneDigits(value);
        return digits !== 5 || value.includes("-");
      }
      return true;
    }
    case "postalGeneric":
      return !POSTAL_GENERIC_ALLOWED.test(char);
    case "phone": {
      const displayMax =
        options.maxLength ?? ORG_INPUT_LIMITS.phone;
      const replacingSelection = start !== end;

      if (/^\d$/.test(char)) {
        if (!replacingSelection) {
          const digitsInField = countPhoneDigits(value);
          if (digitsInField >= ORG_PHONE_MAX_DIGITS) {
            return true;
          }
          if (
            start === end &&
            value.length >= displayMax
          ) {
            return true;
          }
        }
        return false;
      }
      if (char === "+" && start === 0 && end === 0 && !value.includes("+")) {
        return false;
      }
      if (
        (char === " " || char === "-" || char === "(" || char === ")") &&
        value.length > 0
      ) {
        return false;
      }
      return true;
    }
    case "email":
      return !EMAIL_ALLOWED.test(char);
    case "text":
    case "name":
      return false;
    default:
      return false;
  }
}

export function restrictedInputHtmlProps(
  kind: RestrictedInputKind,
): Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "autoComplete" | "maxLength"
> {
  switch (kind) {
    case "pincode":
      return {
        type: "text",
        inputMode: "numeric",
        autoComplete: "postal-code",
        maxLength: ORG_INPUT_LIMITS.pincode,
      };
    case "postalUs":
      return {
        type: "text",
        inputMode: "numeric",
        autoComplete: "postal-code",
        maxLength: ORG_INPUT_LIMITS.postalUs,
      };
    case "postalGeneric":
      return {
        type: "text",
        autoComplete: "postal-code",
        maxLength: ORG_INPUT_LIMITS.postalGeneric,
      };
    case "digits":
      return { type: "text", inputMode: "numeric" };
    case "phone":
      return {
        type: "tel",
        inputMode: "tel",
        autoComplete: "tel",
        maxLength: ORG_INPUT_LIMITS.phone,
      };
    case "email":
      return {
        type: "email",
        inputMode: "email",
        autoComplete: "email",
        maxLength: ORG_INPUT_LIMITS.email,
      };
    case "name":
      return { type: "text", autoComplete: "name" };
    case "text":
    default:
      return { type: "text" };
  }
}
