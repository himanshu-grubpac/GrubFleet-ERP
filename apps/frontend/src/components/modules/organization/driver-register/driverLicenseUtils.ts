const DISPLAY_DATE: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
};

/** Parse ISO calendar date (YYYY-MM-DD) as UTC midnight. */
export function parseIsoDateOnlyUtc(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export function getTodayUtcDateOnly(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Expired when expiry calendar date (UTC) is strictly before today (UTC). */
export function isDrivingLicenseExpired(licenseExpiryDate?: string): boolean {
  if (!licenseExpiryDate?.trim()) return false;

  const expiry = parseIsoDateOnlyUtc(licenseExpiryDate);
  if (!expiry) return false;

  return expiry.getTime() < getTodayUtcDateOnly().getTime();
}

export function formatDriverLicenseDisplayDate(iso: string): string {
  const parsed = parseIsoDateOnlyUtc(iso);
  if (!parsed) return iso.trim();
  return parsed.toLocaleDateString("en-IN", DISPLAY_DATE);
}

export function getLicenseExpiredTooltipMessage(
  licenseExpiryDate: string,
): string {
  return `License expired on ${formatDriverLicenseDisplayDate(licenseExpiryDate)}`;
}
