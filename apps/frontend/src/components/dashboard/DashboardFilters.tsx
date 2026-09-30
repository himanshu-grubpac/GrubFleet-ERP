"use client";

import React from "react";
import { Search, X } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

export type DashboardFilterOption = {
    label: string;
    value: string;
};

export type DashboardSelectFilter = {
    key: string;
    label: string;
    options: DashboardFilterOption[];
};

type DashboardFiltersProps = {
    searchValue?: string;
    searchPlaceholder?: string;
    onSearchChange?: (
        value: string
    ) => void;

    selectFilters?: DashboardSelectFilter[];

    filterValues?: Record<
        string,
        string
    >;

    onFilterChange?: (
        key: string,
        value: string
    ) => void;

    onClear?: () => void;

    showClearButton?: boolean;

    children?: React.ReactNode;
};

export default function DashboardFilters({
    searchValue = "",
    searchPlaceholder = "Search...",
    onSearchChange,

    selectFilters = [],

    filterValues = {},

    onFilterChange,

    onClear,

    showClearButton = true,

    children,
}: DashboardFiltersProps) {
    const hasActiveFilters =
        Boolean(searchValue) ||
        Object.values(filterValues).some(
            (value) => Boolean(value)
        );

    return (
        <div className="mb-4 flex items-center gap-3">
            {/* Search */}
            {onSearchChange && (
                <div className="relative min-w-[240px] flex-1">
                    <Search
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                        strokeWidth={1.8}
                    />

                    <input
                        type="text"
                        value={searchValue}
                        onChange={(event) =>
                            onSearchChange(
                                event.target.value
                            )
                        }
                        placeholder={searchPlaceholder}
                        className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                    />
                </div>
            )}


            {/* Filter Buttons */}
            {selectFilters.map((filter) => (
                <div
                    key={filter.key}
                    className="flex shrink-0 items-center gap-1.5"
                >
                    {/* Default / All */}
                    <button
                        type="button"
                        onClick={() =>
                            onFilterChange?.(
                                filter.key,
                                ""
                            )
                        }
                        className={[
                            "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
                            !filterValues[filter.key]
                                ? "border-gray-900 bg-gray-900 text-white"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                        ].join(" ")}
                    >
                        {filter.label}
                    </button>

                    {/* Filter Options */}
                    {filter.options.map((option) => {
                        const isActive =
                            filterValues[filter.key] ===
                            option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                    onFilterChange?.(
                                        filter.key,
                                        option.value
                                    )
                                }
                                className={[
                                    "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
                                    isActive
                                        ? "border-gray-900 bg-gray-900 text-white"
                                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                                ].join(" ")}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            ))}


            {/* Custom filters/actions */}
            {children}

            {/* Clear */}
            {showClearButton &&
                hasActiveFilters &&
                onClear && (
                    <Button
                        type="button"
                        onClick={onClear}
                        className="h-9 gap-1 px-3 text-sm"
                    >
                        <X
                            className="h-4 w-4"
                            strokeWidth={1.8}
                        />
                        Clear
                    </Button>
                )}
        </div>
    );
}