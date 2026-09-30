import { getCountryDefinition, getCountryLabel } from "@/lib/geo/countries";
import { formatPostalDisplay } from "@/lib/geo/postal";

export type StructuredAddressParts = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressDistrict?: string | null;
  addressState?: string | null;
  addressPincode?: string | null;
  addressCountry?: string | null;
  /** Computed / legacy single-line address from list API */
  address?: string | null;
};

function nonEmptyPart(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** @deprecated Prefer formatPostalDisplay(country, pincode) from `@/lib/geo/postal`. */
export function formatPincodeDisplay(
  pincode: string | null | undefined,
): string | null {
  return formatPostalDisplay("IN", pincode);
}

function formatDistrictStateLine(parts: StructuredAddressParts): string | null {
  const district = nonEmptyPart(parts.addressDistrict);
  const state = nonEmptyPart(parts.addressState);
  const city = nonEmptyPart(parts.addressCity);

  if (district && state) {
    return `${district}, ${state}`;
  }
  if (city && state) {
    return `${city}, ${state}`;
  }
  return district ?? state ?? city;
}

function formatPostalLine(parts: StructuredAddressParts): string | null {
  const formatted = formatPostalDisplay(
    parts.addressCountry,
    parts.addressPincode,
  );
  if (!formatted) {
    return null;
  }
  const countryCode = parts.addressCountry?.trim().toUpperCase() ?? "IN";
  const { postalLabel } = getCountryDefinition(countryCode);
  return `${postalLabel} ${formatted}`;
}

function formatCountryLine(parts: StructuredAddressParts): string | null {
  const code = nonEmptyPart(parts.addressCountry);
  if (!code) {
    return null;
  }
  return getCountryLabel(code);
}

/** View pages and copy blocks — one part per line. */
export function formatStructuredAddressMultiline(
  parts: StructuredAddressParts,
): string {
  const lines = [
    nonEmptyPart(parts.addressLine1),
    nonEmptyPart(parts.addressLine2),
    formatDistrictStateLine(parts),
    formatPostalLine(parts),
    formatCountryLine(parts),
  ].filter((line): line is string => Boolean(line));

  if (lines.length > 0) {
    return lines.join("\n");
  }

  return nonEmptyPart(parts.address) ?? "—";
}

/** List rows and inline summaries — comma-separated parts. */
export function formatStructuredAddressInline(
  parts: StructuredAddressParts,
): string {
  const pincode = formatPostalDisplay(
    parts.addressCountry,
    parts.addressPincode,
  );
  const segments = [
    nonEmptyPart(parts.addressLine1),
    nonEmptyPart(parts.addressLine2),
    formatDistrictStateLine(parts),
    pincode ? formatPostalLine(parts) : null,
    formatCountryLine(parts),
  ].filter((segment): segment is string => Boolean(segment));

  if (segments.length > 0) {
    return segments.join(", ");
  }

  return nonEmptyPart(parts.address) ?? "—";
}
