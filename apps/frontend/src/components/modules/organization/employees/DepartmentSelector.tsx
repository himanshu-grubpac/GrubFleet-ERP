"use client";

import { ChevronDown } from "lucide-react";

type DepartmentSelectorProps = {
    selectedDepartment: string;
    onSelect: (department: string) => void;
    error?: string;
};

const DEPARTMENTS = [
    "Workshop",
    "Operations",
    "Fleet",
    "Finance",
    "Human Resources",
    "Administration",
    "Sales",
    "Procurement",
];

export default function DepartmentSelector({
    selectedDepartment,
    onSelect,
    error,
}: DepartmentSelectorProps) {
    return (
        <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
                Department
                <span className="ml-1 text-red-500">
                    *
                </span>
            </label>

            <div className="relative">
                <select
                    value={selectedDepartment}
                    onChange={(event) =>
                        onSelect(event.target.value)
                    }
                    className={[
                        "h-10 w-full appearance-none rounded-md border bg-white px-3 pr-10 text-sm text-gray-700 outline-none transition",
                        error
                            ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                            : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                    ].join(" ")}
                >
                    <option value="">
                        Select department
                    </option>

                    {DEPARTMENTS.map((department) => (
                        <option
                            key={department}
                            value={department}
                        >
                            {department}
                        </option>
                    ))}
                </select>

                <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
            </div>

            {error && (
                <p className="mt-1 text-xs text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}