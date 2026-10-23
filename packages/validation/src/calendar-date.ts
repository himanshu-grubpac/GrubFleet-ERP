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

/** Process-local calendar date (YYYY-MM-DD). Not org timezone. */
export function getLocalCalendarDateToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalCalendarYear(): number {
  return new Date().getFullYear();
}

/** Local calendar month as YYYY-MM. */
export function getLocalCalendarYearMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

const ISO_CALENDAR_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Lower bound that keeps an already-saved past ISO date selectable.
 * When `saved` is before `floor`, the bound is `saved`; otherwise `floor`.
 */
export function isoDateFloorKeepingSaved(
  saved: string | null | undefined,
  floor: string,
): string {
  const trimmed = saved?.trim().slice(0, 10) ?? '';
  if (ISO_CALENDAR_DATE_ONLY.test(trimmed) && trimmed < floor) {
    return trimmed;
  }
  return floor;
}

export function isYearMonthAfterCurrentLocal(value: string): boolean {
  const trimmed = value.trim();
  if (!YEAR_MONTH.test(trimmed)) {
    return false;
  }
  return trimmed > getLocalCalendarYearMonth();
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
