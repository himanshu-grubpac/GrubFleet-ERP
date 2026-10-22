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
