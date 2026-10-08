export const PRESET_EMPLOYEE_DEPARTMENTS = [
  "Leadership",
  "Fleet Operations",
  "Workshop",
  "Inventory",
  "Human Resources",
] as const;

export type EmployeeDepartmentFilterOption = {
  label: string;
  value: string;
};

function normalizeDepartmentKey(name: string): string {
  return name.trim().toLowerCase();
}

export function buildEmployeeDepartmentFilterOptions(
  usedInOrg: readonly string[],
): EmployeeDepartmentFilterOption[] {
  const seen = new Set<string>();
  const names: string[] = [];

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = normalizeDepartmentKey(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    names.push(trimmed);
  };

  for (const preset of PRESET_EMPLOYEE_DEPARTMENTS) {
    add(preset);
  }
  for (const department of usedInOrg) {
    add(department);
  }

  return names
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ label: name, value: name }));
}
