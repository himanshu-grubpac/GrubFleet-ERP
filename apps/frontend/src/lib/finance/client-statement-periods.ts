export type ClientStatementPeriodPreset = {
  id: string;
  label: string;
  periodStart: string;
  periodEnd: string;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function quarterBounds(
  year: number,
  quarter: 1 | 2 | 3 | 4,
): { start: string; end: string; label: string } {
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;
  const start = toIsoDate(year, startMonth, 1);
  const end = toIsoDate(year, endMonth, lastDayOfMonth(year, endMonth));
  const label = `Q${quarter} ${year} ${MONTH_NAMES[startMonth]}–${MONTH_NAMES[endMonth]}`;
  return { start, end, label };
}

function calendarQuarter(date: Date): 1 | 2 | 3 | 4 {
  return (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

/** Rolling calendar quarters (current + prior 7) for statement period filter. */
export function getClientStatementPeriodPresets(
  referenceDate: Date = new Date(),
): ClientStatementPeriodPreset[] {
  const presets: ClientStatementPeriodPreset[] = [];
  let year = referenceDate.getFullYear();
  let quarter = calendarQuarter(referenceDate);

  for (let i = 0; i < 8; i += 1) {
    const bounds = quarterBounds(year, quarter);
    presets.push({
      id: `${year}-Q${quarter}`,
      label: bounds.label,
      periodStart: bounds.start,
      periodEnd: bounds.end,
    });
    quarter -= 1;
    if (quarter < 1) {
      quarter = 4;
      year -= 1;
    }
  }
  return presets;
}

export function findPeriodPresetByRange(
  periodStart: string,
  periodEnd: string,
  presets: ClientStatementPeriodPreset[],
): ClientStatementPeriodPreset | undefined {
  return presets.find(
    (p) => p.periodStart === periodStart && p.periodEnd === periodEnd,
  );
}

export function formatPeriodLabel(
  periodStart: string,
  periodEnd: string,
  presets: ClientStatementPeriodPreset[],
): string {
  const match = findPeriodPresetByRange(periodStart, periodEnd, presets);
  if (match) return match.label;
  return `${periodStart} – ${periodEnd}`;
}
