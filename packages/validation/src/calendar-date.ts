/** Strict ISO 8601 calendar date — YYYY-MM-DD only (no time, no locale formats). */
export const ISO_CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const ISO_CALENDAR_DATE_INVALID_MESSAGE =
  'Must be an ISO 8601 calendar date (YYYY-MM-DD)';

export const ISO_CALENDAR_DATE_FUTURE_MESSAGE =
  'Date must not be in the future';

export type IsoCalendarDateValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function getUtcCalendarDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function validateIsoCalendarDate(
  raw: string,
  options?: { allowFuture?: boolean },
): IsoCalendarDateValidationResult {
  const trimmed = raw.trim();
  if (!ISO_CALENDAR_DATE_PATTERN.test(trimmed)) {
    return { ok: false, message: ISO_CALENDAR_DATE_INVALID_MESSAGE };
  }

  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return { ok: false, message: ISO_CALENDAR_DATE_INVALID_MESSAGE };
  }

  if (!options?.allowFuture) {
    const today = getUtcCalendarDateToday();
    if (trimmed > today) {
      return { ok: false, message: ISO_CALENDAR_DATE_FUTURE_MESSAGE };
    }
  }

  return { ok: true };
}
