export {
  getLocalCalendarDateToday as localTodayIsoDate,
  getLocalCalendarYear as localCurrentYear,
  getLocalCalendarYearMonth as localCurrentYearMonth,
  isoDateFloorKeepingSaved,
} from "@grubpac/validation";

/** ISO calendar date (YYYY-MM-DD) → en-IN display. */
export function formatCalendarDateEnIn(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
