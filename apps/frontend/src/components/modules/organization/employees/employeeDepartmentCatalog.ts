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

export function customDepartmentNamesFromOrg(
  usedInOrg: readonly string[],
): string[] {
  const presetKeys = new Set(
    PRESET_EMPLOYEE_DEPARTMENTS.map((name) => normalizeDepartmentKey(name)),
  );
  const seen = new Set<string>();
  const custom: string[] = [];

  for (const department of usedInOrg) {
    const trimmed = department.trim();
    if (!trimmed) continue;
    const key = normalizeDepartmentKey(trimmed);
    if (presetKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    custom.push(trimmed);
  }

  return custom.sort((a, b) => a.localeCompare(b));
}
