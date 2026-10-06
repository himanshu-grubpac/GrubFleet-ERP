"use client";

import React, {
    useEffect,
    useRef,
    useState,
} from "react";
import {
    Search,
    X,
    ChevronDown,
} from "lucide-react";

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
    const [openFilter, setOpenFilter] =
        useState<string | null>(null);

    const filterContainerRef =
        useRef<HTMLDivElement>(null);

    /* ---------------------------------------------------------------------- */
    /* Close dropdown when clicking outside                                    */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        const handleClickOutside = (
            event: MouseEvent
        ) => {
            if (
                filterContainerRef.current &&
                !filterContainerRef.current.contains(
                    event.target as Node
                )
            ) {
                setOpenFilter(null);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    /* ---------------------------------------------------------------------- */
    /* Active Filters                                                          */
    /* ---------------------------------------------------------------------- */

    const hasActiveFilters =
        Boolean(searchValue) ||
        Object.values(filterValues).some(
            (value) => Boolean(value)
        );

    /* ---------------------------------------------------------------------- */
    /* Filter Title                                                            */
    /* ---------------------------------------------------------------------- */

    const getFilterTitle = (
        label: string
    ) => {
        const cleanedLabel = label
            .replace(/^all\s+/i, "")
            .trim();

        if (
            cleanedLabel
                .toLowerCase()
                .endsWith("ies")
        ) {
            return (
                cleanedLabel.slice(0, -3) +
                "y"
            ).replace(
                /^./,
                (char) =>
                    char.toUpperCase()
            );
        }

        if (
            cleanedLabel
                .toLowerCase()
                .endsWith("s")
        ) {
            return cleanedLabel
                .slice(0, -1)
                .replace(
                    /^./,
                    (char) =>
                        char.toUpperCase()
                );
        }

        return cleanedLabel.replace(
            /^./,
            (char) =>
                char.toUpperCase()
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Selected Option                                                         */
    /* ---------------------------------------------------------------------- */

    const getSelectedOption = (
        filter: DashboardSelectFilter
    ) => {
        const selectedValue =
            filterValues[filter.key];

        if (!selectedValue) {
            return null;
        }

        return filter.options.find(
            (option) =>
                option.value ===
                selectedValue
        );
    };

    return (
        <div className="mb-4 flex items-center gap-3">
            {/* ========================================================== */}
            {/* Search                                                       */}
            {/* ========================================================== */}

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
                        placeholder={
                            searchPlaceholder
                        }
                        className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                    />
                </div>
            )}

            {/* ========================================================== */}
            {/* Filters                                                      */}
            {/* ========================================================== */}

            <div
                ref={filterContainerRef}
                className="flex shrink-0 items-center gap-2"
            >
                {selectFilters.map(
                    (filter) => {
                        const selectedOption =
                            getSelectedOption(
                                filter
                            );

                        const filterTitle =
                            getFilterTitle(
                                filter.label
                            );

                        const displayValue =
                            selectedOption?.label ??
                            "All";

                        const isOpen =
                            openFilter ===
                            filter.key;

                        return (
                            <div
                                key={filter.key}
                                className="relative"
                            >
                                {/* ================================================== */}
                                {/* Filter Button                                          */}
                                {/* ================================================== */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpenFilter(
                                            isOpen
                                                ? null
                                                : filter.key
                                        )
                                    }
                                    className={[
                                        "flex h-9 min-w-[165px] items-center justify-between",
                                        "rounded-md border px-3",
                                        "text-sm font-medium",
                                        "outline-none",
                                        "transition-all",
                                        "border-[#FE5720]/30",
                                        "bg-[#FE5720]/5",
                                        "text-[#FE5720]",
                                        "hover:bg-[#FE5720]/10",
                                        "focus:border-[#FE5720]",
                                        "focus:ring-1",
                                        "focus:ring-[#FE5720]/20",
                                    ].join(
                                        " "
                                    )}
                                >
                                    <span className="truncate">
                                        {
                                            filterTitle
                                        }
                                        :{" "}
                                        {
                                            displayValue
                                        }
                                    </span>

                                    <ChevronDown
                                        className={[
                                            "ml-2 h-4 w-4 shrink-0 transition-transform",
                                            isOpen
                                                ? "rotate-180"
                                                : "",
                                        ].join(
                                            " "
                                        )}
                                        strokeWidth={
                                            2
                                        }
                                    />
                                </button>

                                {/* ================================================== */}
                                {/* Dropdown                                             */}
                                {/* ================================================== */}

                                {isOpen && (
                                    <div
                                        className={[
                                            "absolute right-0 z-50 mt-1",
                                            "min-w-full w-max",
                                            "overflow-hidden",
                                            "rounded-md",
                                            "border border-gray-200",
                                            "bg-white",
                                            "py-1",
                                            "shadow-lg",
                                        ].join(
                                            " "
                                        )}
                                    >
                                        {/* -------------------------------------- */}
                                        {/* All                                    */}
                                        {/* -------------------------------------- */}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                onFilterChange?.(
                                                    filter.key,
                                                    ""
                                                );

                                                setOpenFilter(
                                                    null
                                                );
                                            }}
                                            className={[
                                                "flex w-full items-center px-3 py-2",
                                                "text-left text-sm",
                                                "transition-colors",
                                                !filterValues[
                                                    filter.key
                                                ]
                                                    ? "bg-[#FE5720]/10 font-medium text-[#FE5720]"
                                                    : "text-gray-700 hover:bg-[#FE5720]/5",
                                            ].join(
                                                " "
                                            )}
                                        >
                                            All
                                        </button>

                                        {/* -------------------------------------- */}
                                        {/* Options                                */}
                                        {/* -------------------------------------- */}

                                        {filter.options.map(
                                            (
                                                option
                                            ) => {
                                                const isActive =
                                                    filterValues[
                                                    filter.key
                                                    ] ===
                                                    option.value;

                                                return (
                                                    <button
                                                        key={
                                                            option.value
                                                        }
                                                        type="button"
                                                        onClick={() => {
                                                            onFilterChange?.(
                                                                filter.key,
                                                                option.value
                                                            );

                                                            setOpenFilter(
                                                                null
                                                            );
                                                        }}
                                                        className={[
                                                            "flex w-full items-center px-3 py-2",
                                                            "text-left text-sm",
                                                            "transition-colors",
                                                            isActive
                                                                ? "bg-[#FE5720]/10 font-medium text-[#FE5720]"
                                                                : "text-gray-700 hover:bg-[#FE5720]/5",
                                                        ].join(
                                                            " "
                                                        )}
                                                    >
                                                        {
                                                            option.label
                                                        }
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }
                )}
            </div>

            {/* ========================================================== */}
            {/* Custom Filters / Actions                                    */}
            {/* ========================================================== */}

            {children}

            {/* ========================================================== */}
            {/* Clear                                                       */}
            {/* ========================================================== */}

            {showClearButton &&
                hasActiveFilters &&
                onClear && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                            setOpenFilter(null);
                            onClear();
                        }}
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