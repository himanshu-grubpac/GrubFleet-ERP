/** Parse odometer interval from schedule intervalLabel (e.g. "5000 km"). */
export function parseOdometerIntervalKm(
  intervalLabel: string | null | undefined,
  intervalType: string | null | undefined,
): number | null {
  if (intervalType?.trim().toLowerCase() !== 'odometer') {
    return null;
  }
  const trimmed = intervalLabel?.trim() ?? '';
  if (!trimmed) return null;
  const match = trimmed.match(/^([\d,]+)\s*km$/i);
  if (!match?.[1]) return null;
  const digits = match[1].replace(/,/g, '');
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function isOdometerThresholdReached(
  currentOdometer: number,
  baselineOdometer: number,
  intervalKm: number,
): boolean {
  if (intervalKm <= 0) return false;
  return currentOdometer >= baselineOdometer + intervalKm;
}

export function normalizeAssetClassMatchLabel(
  label: string | null | undefined,
): string | null {
  const trimmed = label?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}
