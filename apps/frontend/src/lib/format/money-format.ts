/** Display INR amounts from minor units (paise). */
export function formatInrFromMinor(minor: number): string {
  const major = minor / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(major);
}

/** Parse rupee string to minor units; returns null if invalid. */
export function parseRupeeInputToMinor(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const major = Number(normalized);
  if (!Number.isFinite(major) || major <= 0) return null;
  const minor = Math.round(major * 100);
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}
