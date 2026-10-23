import {
  DECIMAL_MONEY_PATTERN,
  decimalMoneyAmountToPatternText,
  isValidDecimalMoneyNumber,
} from "@grubpac/validation";

/** Max digits in the major (rupee) part before the decimal — ERP-wide money inputs. */
export const INR_MONEY_MAX_MAJOR_DIGITS = 12;

/** Remove grouping commas; trim. */
export function stripRupeeInputGrouping(value: string): string {
  return value.replace(/,/g, "").trim();
}

/**
 * en-IN grouped display for controlled money inputs (commas while typing).
 * Accepts digits + optional single decimal (max 2 fraction digits).
 */
export function formatRupeeInputDisplay(value: string): string {
  const stripped = stripRupeeInputGrouping(value);
  if (!stripped) return "";

  const dotIndex = stripped.indexOf(".");
  const intRaw =
    dotIndex >= 0 ? stripped.slice(0, dotIndex) : stripped;
  const fracRaw =
    dotIndex >= 0 ? stripped.slice(dotIndex + 1) : "";

  const intDigits = intRaw.replace(/\D/g, "").slice(0, INR_MONEY_MAX_MAJOR_DIGITS);
  const fracDigits = fracRaw.replace(/\D/g, "").slice(0, 2);

  if (!intDigits && !fracDigits && !stripped.includes(".")) {
    return "";
  }

  const intFormatted =
    intDigits.length > 0
      ? Number(intDigits).toLocaleString("en-IN", {
          maximumFractionDigits: 0,
          useGrouping: true,
        })
      : "0";

  if (dotIndex >= 0) {
    if (fracDigits.length > 0) {
      return `${intFormatted}.${fracDigits}`;
    }
    return `${intFormatted}.`;
  }

  return intFormatted;
}

/** Sanitizer for `RestrictedInput` kind `inrRupee`. */
export function sanitizeRupeeInputValue(value: string): string {
  const stripped = stripRupeeInputGrouping(value);
  if (!stripped) return "";

  const dotIndex = stripped.indexOf(".");
  const intPart =
    dotIndex >= 0 ? stripped.slice(0, dotIndex) : stripped;
  const fracPart =
    dotIndex >= 0 ? stripped.slice(dotIndex + 1) : "";

  const intDigits = intPart.replace(/\D/g, "").slice(0, INR_MONEY_MAX_MAJOR_DIGITS);
  const fracDigits = fracPart.replace(/\D/g, "").slice(0, 2);

  if (dotIndex >= 0) {
    if (fracDigits.length > 0) {
      return formatRupeeInputDisplay(`${intDigits}.${fracDigits}`);
    }
    return formatRupeeInputDisplay(`${intDigits}.`);
  }

  return formatRupeeInputDisplay(intDigits);
}

/** Major rupee amount — en-IN grouping (display / copy). */
export function formatInrMajorUnits(
  value: number,
  options?: { maximumFractionDigits?: number },
): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
}

/** Display INR amounts from minor units (paise). */
export function formatInrFromMinor(minor: number): string {
  const major = minor / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(major);
}

/** Parse rupee string (with or without commas) to minor units; null if invalid. */
export function parseRupeeInputToMinor(value: string): number | null {
  const normalized = stripRupeeInputGrouping(value);
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const major = Number(normalized);
  if (!Number.isFinite(major) || major <= 0) return null;
  const minor = Math.round(major * 100);
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

/** Parse API / DB decimal strings or numbers to major rupee units for display. */
export function coerceInrMajorUnits(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Lease / legacy label — major units with Rs. prefix (en-IN commas). */
export function formatIndianRupeeLabel(
  value: string | number | null | undefined,
): string {
  const major = coerceInrMajorUnits(value);
  if (major == null) return "—";
  return `Rs. ${formatInrMajorUnits(major, { maximumFractionDigits: 0 })}`;
}

export const INR_RUPEE_INPUT_PLACEHOLDER = "e.g. 50,000";

/** Parse controlled rupee input to JSON number (major units, max 2 decimals). */
export function parseRupeeInputToMajorNumber(value: string): number {
  const normalized = stripRupeeInputGrouping(value);
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Fleet lease contract write amounts — decimal string for API (security deposit, line rates). */
export function normalizeDecimalMoneyForLeaseApi(value: string): string {
  const normalized = stripRupeeInputGrouping(value.trim());
  if (!normalized) {
    return "";
  }

  const withoutTrailingSeparators = normalized.replace(/\.+$/, "");
  const candidates = [
    normalized,
    ...(withoutTrailingSeparators !== normalized
      ? [withoutTrailingSeparators]
      : []),
  ];

  for (const candidate of candidates) {
    if (!DECIMAL_MONEY_PATTERN.test(candidate)) {
      continue;
    }
    const major = Number(candidate);
    if (!Number.isFinite(major)) {
      continue;
    }
    return decimalMoneyAmountToPatternText(major);
  }

  const coercedMajor = Number(withoutTrailingSeparators);
  if (
    Number.isFinite(coercedMajor) &&
    coercedMajor >= 0 &&
    isValidDecimalMoneyNumber(coercedMajor)
  ) {
    return decimalMoneyAmountToPatternText(coercedMajor);
  }

  return withoutTrailingSeparators || normalized;
}

/**
 * Line rates on asset-lines step may be blank until terms — backend requires DECIMAL_MONEY.
 * Persist `0.00` until the user enters rates on the terms step.
 */
export function normalizeLeaseLineRateForApi(value: string): string {
  const normalized = normalizeDecimalMoneyForLeaseApi(value);
  if (normalized && DECIMAL_MONEY_PATTERN.test(normalized)) {
    return normalized;
  }
  return "0.00"; // LEASE_WIZARD_DRAFT_ASSET_LINE_RATE_PLACEHOLDER
}

export type LeaseDecimalMoneyValidationOptions = {
  label?: string;
  required?: boolean;
  min?: number;
};

/** Client save validation — mirrors DECIMAL_MONEY_PATTERN + optional minimum. */
export function validateLeaseDecimalMoneyInput(
  value: string,
  options: LeaseDecimalMoneyValidationOptions = {},
): string | undefined {
  const {
    label = "Amount",
    required = true,
    min = 0,
  } = options;
  const stripped = stripRupeeInputGrouping(String(value ?? "").trim());

  if (!stripped) {
    return required ? `${label} is required.` : undefined;
  }

  if (!DECIMAL_MONEY_PATTERN.test(stripped)) {
    return `Enter a valid ${label.toLowerCase()}.`;
  }

  const numeric = Number(stripped);
  if (!Number.isFinite(numeric)) {
    return `Enter a valid ${label.toLowerCase()}.`;
  }

  if (numeric < min) {
    return `${label} must be at least ${min}.`;
  }

  return undefined;
}

/** Format API/DB decimal money for controlled inrRupee inputs. */
export function formatLeaseDecimalMoneyForInput(
  value: string | number | null | undefined,
): string {
  if (value == null) {
    return "";
  }
  const text = String(value).trim();
  if (!text) {
    return "";
  }
  const major = coerceInrMajorUnits(text);
  if (major == null) {
    return "";
  }
  return formatRupeeInputDisplay(decimalMoneyAmountToPatternText(major));
}
