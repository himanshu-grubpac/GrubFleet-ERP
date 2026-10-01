"use client";

import { ChevronDown } from "lucide-react";

export type EmployeeType =
    | "Full-time"
    | "Part-time"
    | "Contract";

type EmployeeTypeSelectorProps = {
    selectedType: EmployeeType | "";
    onSelect: (type: EmployeeType) => void;
    error?: string;
};

const EMPLOYEE_TYPES: EmployeeType[] = [
    "Full-time",
    "Part-time",
    "Contract",
];

export default function EmployeeTypeSelector({
    selectedType,
    onSelect,
    error,
}: EmployeeTypeSelectorProps) {
    return (
        <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
                EMPLOYMENT TYPE
                <span className="ml-1 text-red-500">
                    *
                </span>
            </label>

            <div className="relative">
                <select
                    value={selectedType}
                    onChange={(event) => {
                        onSelect(
                            event.target.value as EmployeeType
                        );
                    }}
                    className={[
                        "h-10 w-full appearance-none rounded-md border bg-white px-3 pr-10 text-sm text-gray-700 outline-none transition",
                        error
                            ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                            : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                    ].join(" ")}
                >
                    <option value="">
                        Select employment type
                    </option>

                    {EMPLOYEE_TYPES.map((type) => (
                        <option
                            key={type}
                            value={type}
                        >
                            {type}
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