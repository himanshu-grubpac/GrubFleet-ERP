export type ComplianceItemKind = 'insurance' | 'registration' | 'warranty';

export type ComplianceItemStatus = 'expired' | 'expiring_soon' | 'valid';

export const COMPLIANCE_EXPIRING_SOON_DAYS = 30;

export function parseIsoDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function complianceStatusForEndDate(
  endDateIso: string,
  today: Date = startOfUtcDay(new Date()),
): ComplianceItemStatus {
  const end = startOfUtcDay(parseIsoDateOnly(endDateIso));
  if (end < today) {
    return 'expired';
  }
  const soonThreshold = new Date(today);
  soonThreshold.setUTCDate(
    soonThreshold.getUTCDate() + COMPLIANCE_EXPIRING_SOON_DAYS,
  );
  if (end <= soonThreshold) {
    return 'expiring_soon';
  }
  return 'valid';
}

export function worstComplianceStatus(
  statuses: ComplianceItemStatus[],
): ComplianceItemStatus {
  if (statuses.includes('expired')) return 'expired';
  if (statuses.includes('expiring_soon')) return 'expiring_soon';
  return 'valid';
}
