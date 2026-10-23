/**
 * Organisation module — client validation aligned with backend DTOs.
 * Sanitization lives in `@/lib/forms/restricted-input`; this module is for
 * patterns, limits, and user-facing messages.
 */

import { ORG_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import {
  EMAIL_STORAGE_MAX_LENGTH,
  isValidEmail,
} from "@/lib/validation/email-validation";

export { ORG_INPUT_LIMITS } from "@/lib/forms/restricted-input";
export {
  sanitizeDigitsValue as restrictNumericInput,
  sanitizePincodeValue,
  sanitizePhoneValue,
  sanitizeEmailValue,
  sanitizeRestrictedInputValue,
  type RestrictedInputKind,
} from "@/lib/forms/restricted-input";

/** UX-only quick check; prefer `isValidOrgEmail` / `@grubpac/validation` for save gates. */
export const ORG_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ORG_PINCODE_PATTERN = /^\d{6}$/;

export function isValidOrgEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed.length > EMAIL_STORAGE_MAX_LENGTH) {
    return false;
  }
  return isValidEmail(trimmed);
}

export function isValidOrgPincode(value: string): boolean {
  return ORG_PINCODE_PATTERN.test(value.trim());
}

export function isWithinOrgMaxLength(value: string, max: number): boolean {
  return value.trim().length <= max;
}

export function orgMaxLengthMessage(fieldLabel: string, max: number): string {
  return `${fieldLabel} must be at most ${max} characters.`;
}

export const ORG_VALIDATION_MESSAGES = {
  emailInvalid: "Enter a valid email address.",
  pincodeInvalid: "Pincode must contain 6 digits.",
  pincodeRequired: "Pincode is required.",
} as const;
