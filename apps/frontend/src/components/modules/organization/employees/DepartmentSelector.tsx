"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { InlineAddField } from "@/components/ui/inline-add-field";
import { ORG_INPUT_LIMITS } from "@/lib/validation/org-input-constraints";

import {
  PRESET_EMPLOYEE_DEPARTMENTS,
  customDepartmentNamesFromOrg,
} from "./employeeDepartmentCatalog";

export type DepartmentOption = {
  id: string;
  name: string;
  isCustom: boolean;
  isUsed: boolean;
};

type DepartmentSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  usedDepartmentNames?: string[];
  orgDepartmentNames?: string[];
};

function toCustomDepartmentOption(name: string): DepartmentOption {
  return {
    id: `custom-dept-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    isCustom: true,
    isUsed: false,
  };
}

function buildPresetOptions(): DepartmentOption[] {
  return PRESET_EMPLOYEE_DEPARTMENTS.map((name) => ({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    isCustom: false,
    isUsed: false,
  }));
}

export default function DepartmentSelector({
  value,
  onChange,
  usedDepartmentNames = [],
  orgDepartmentNames = [],
}: DepartmentSelectorProps) {
  const [customDepartments, setCustomDepartments] = useState<
    DepartmentOption[]
  >([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const orgCustomNames = useMemo(
    () => customDepartmentNamesFromOrg(orgDepartmentNames),
    [orgDepartmentNames],
  );

  useEffect(() => {
    setCustomDepartments((previous) => {
      const byKey = new Map<string, DepartmentOption>();
      for (const name of orgCustomNames) {
        byKey.set(name.toLowerCase(), toCustomDepartmentOption(name));
      }
      for (const dept of previous) {
        if (!byKey.has(dept.name.toLowerCase())) {
          byKey.set(dept.name.toLowerCase(), dept);
        }
      }
      return Array.from(byKey.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    });
  }, [orgCustomNames]);

  const usedSet = useMemo(
    () => new Set(usedDepartmentNames.map((name) => name.toLowerCase())),
    [usedDepartmentNames],
  );

  const allDepartments = useMemo(() => {
    const markUsed = (dept: DepartmentOption): DepartmentOption => ({
      ...dept,
      isUsed: usedSet.has(dept.name.toLowerCase()),
    });
    return [
      ...buildPresetOptions().map(markUsed),
      ...customDepartments.map(markUsed),
    ];
  }, [customDepartments, usedSet]);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const exists = allDepartments.some(
      (dept) => dept.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;

    const created = toCustomDepartmentOption(trimmed);
    setCustomDepartments((previous) => [...previous, created]);
    setNewName("");
    setShowAdd(false);
    onChange(trimmed);
  };

  const handleRemoveCustom = (dept: DepartmentOption) => {
    if (!dept.isCustom || dept.isUsed) return;
    if (value === dept.name) {
      onChange("");
    }
    setCustomDepartments((previous) =>
      previous.filter((item) => item.id !== dept.id),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {allDepartments.map((dept) => {
          const selected = value === dept.name;
          return (
            <div key={dept.id} className="relative">
              <button
                type="button"
                onClick={() => onChange(dept.name)}
                className={[
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "border-[#FE5720] bg-orange-50 text-[#FE5720]"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {dept.name}
              </button>
              {dept.isCustom && (
                <button
                  type="button"
                  disabled={dept.isUsed}
                  onClick={() => handleRemoveCustom(dept)}
                  title={
                    dept.isUsed
                      ? "This department is assigned to employees"
                      : "Remove department"
                  }
                  className={[
                    "absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border text-[10px]",
                    dept.isUsed
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300"
                      : "border-gray-300 bg-white text-gray-500 hover:border-red-300 hover:text-red-500",
                  ].join(" ")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAdd((previous) => !previous)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add more
        </button>
      </div>

      {showAdd ? (
        <InlineAddField
          layout="panel"
          value={newName}
          onChange={setNewName}
          onAdd={handleAdd}
          maxLength={ORG_INPUT_LIMITS.department}
          placeholder="Department name"
          autoFocus
          onCancel={() => {
            setNewName("");
            setShowAdd(false);
          }}
        />
      ) : null}
    </div>
  );
}
