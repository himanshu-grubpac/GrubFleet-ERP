"use client";

import React from "react";

type SupplierFilter =
    | "all"
    | "vehicles"
    | "parts"
    | "drivers"
    | "compliance"
    | "flagged";

type SupplierFiltersProps = {
    searchValue: string;
    activeFilter: SupplierFilter;
    onSearchChange: (value: string) => void;
    onFilterChange: (filter: SupplierFilter) => void;
};

const FILTERS: {
    label: string;
    value: SupplierFilter;
}[] = [
        {
            label: "All",
            value: "all",
        },
        {
            label: "Vehicles",
            value: "vehicles",
        },
        {
            label: "Parts",
            value: "parts",
        },
        {
            label: "Drivers",
            value: "drivers",
        },
        {
            label: "Compliance",
            value: "compliance",
        },
    ];

export default function SupplierFilters({
    searchValue,
    activeFilter,
    onSearchChange,
    onFilterChange,
}: SupplierFiltersProps) {
    return (
        <div className="flex items-center gap-3" >
            {/* Search */}
            < div className="min-w-0 flex-1" >
                <input
                    type="text"
                    value={searchValue}
                    onChange={(event) =>
                        onSearchChange(event.target.value)
                    }
                    placeholder="Search by supplier or contact person name"
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                />
            </div>

            {/* Supplier Filters */}
            <div className="flex shrink-0 items-center gap-1.5" >
                {
                    FILTERS.map((filter) => {
                        const isActive = activeFilter === filter.value;

                        return (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() => onFilterChange(filter.value)
                                }
                                className={
                                    [
                                        "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                                        isActive
                                            ? "border-gray-900 bg-gray-900 text-white"
                                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                                    ].join(" ")
                                }
                            >
                                {filter.label}
                            </button>
                        );
                    })}
            </div>
        </div>
    );
}