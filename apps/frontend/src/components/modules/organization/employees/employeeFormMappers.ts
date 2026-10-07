import type { EmploymentType } from "./types";

/** UI labels shown in Khushi employment-type chips (unchanged visually). */
export const EMPLOYMENT_TYPE_UI_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
] as const;

export type EmploymentTypeUiLabel =
  (typeof EMPLOYMENT_TYPE_UI_OPTIONS)[number];

const UI_TO_API: Record<string, EmploymentType> = {
  "full-time": "full_time",
  "full time": "full_time",
  full_time: "full_time",
  "part-time": "part_time",
  "part time": "part_time",
  part_time: "part_time",
  contract: "contract",
};

const API_TO_UI: Record<EmploymentType, EmploymentTypeUiLabel> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
};

export function employmentTypeUiToApi(
  label: string,
): EmploymentType | null {
  const key = label.trim().toLowerCase();
  return UI_TO_API[key] ?? null;
}

export function employmentTypeApiToUi(
  value: EmploymentType,
): EmploymentTypeUiLabel {
  return API_TO_UI[value];
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const MONTH_LABELS = [
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

/** Accepts YYYY-MM-DD or DD-MMM-YYYY → ISO date for API. */
export function parseEmployeeDateForApi(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = MONTH_INDEX[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (month === undefined || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** ISO YYYY-MM-DD → DD-MMM-YYYY for the existing text field. */
export function formatEmployeeDateForForm(iso: string): string {
  const trimmed = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const [year, month, day] = trimmed.split("-").map(Number);
  if (!year || !month || !day) return trimmed;
  const label = MONTH_LABELS[month - 1];
  if (!label) return trimmed;
  return `${String(day).padStart(2, "0")}-${label}-${year}`;
}
