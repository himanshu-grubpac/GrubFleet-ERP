"use client";

import React, { useMemo, useState } from "react";

export type DashboardSortType =
    | "alphabetical"
    | "number"
    | "vehicleType"
    | "fuelType"
    | "status"
    | "custom";

export type DashboardColumn<T> = {
    key: keyof T | string;
    label: string;
    render?: (row: T) => React.ReactNode;
    className?: string;
    /** Set to false to disable sorting. Defaults to true. */
    sortable?: boolean;
    /** Optional sorting strategy for this column. */
    sortType?: DashboardSortType;
    /** Custom ascending order, used with sortType: "custom". */
    sortOrder?: string[];
};

type SortDirection = "asc" | "desc";

type SortState = {
    key: string;
    direction: SortDirection;
};

type DashboardTableProps<T> = {
    columns: DashboardColumn<T>[];
    data: T[];
    getRowKey: (row: T) => string;
    renderActions?: (row: T) => React.ReactNode;
    /**
     * @deprecated No longer has any effect. Row action menus render in a
     * portal (see DashboardRowActionsMenu), so the scroll container no
     * longer needs to allow overflow. Kept so existing callers still compile.
     */
    allowOverflow?: boolean;
};

function isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === "";
}

function compareValues<T>(
    a: unknown,
    b: unknown,
    column: DashboardColumn<T>,
): number {
    if (isEmpty(a) || isEmpty(b)) {
        return isEmpty(a) === isEmpty(b) ? 0 : isEmpty(a) ? 1 : -1;
    }

    const valueA = String(a).trim().toLowerCase();
    const valueB = String(b).trim().toLowerCase();

    if (column.sortType === "number") {
        return Number(a) - Number(b);
    }

    if (column.sortType === "vehicleType") {
        const order = ["2-wheeler", "3-wheeler", "4-wheeler"];
        const indexA = order.indexOf(valueA);
        const indexB = order.indexOf(valueB);

        if (indexA !== -1 || indexB !== -1) {
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        }
    }



    if (column.sortType === "status") {
        const order = ["active", "inactive"];
        const indexA = order.indexOf(valueA);
        const indexB = order.indexOf(valueB);

        if (indexA !== -1 || indexB !== -1) {
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        }
    }

    if (column.sortType === "custom" && column.sortOrder) {
        const indexA = column.sortOrder.findIndex(
            (item) => item.toLowerCase() === valueA,
        );
        const indexB = column.sortOrder.findIndex(
            (item) => item.toLowerCase() === valueB,
        );

        if (indexA !== -1 || indexB !== -1) {
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        }
    }

    if (typeof a === "number" && typeof b === "number") {
        return a - b;
    }

    if (typeof a === "boolean" && typeof b === "boolean") {
        return Number(a) - Number(b);
    }

    return valueA.localeCompare(valueB, undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

export default function DashboardTable<T>({
    columns,
    data,
    getRowKey,
    renderActions,
}: DashboardTableProps<T>) {
    const [sort, setSort] = useState<SortState | null>(null);

    const sortedData = useMemo(() => {
        if (!sort) return data;

        const column = columns.find(
            (item) => String(item.key) === sort.key,
        );

        if (!column || column.sortable === false) return data;

        const direction = sort.direction === "asc" ? 1 : -1;

        return [...data].sort((rowA, rowB) => {
            const valueA = (
                rowA as Record<string, unknown>
            )[sort.key];

            const valueB = (
                rowB as Record<string, unknown>
            )[sort.key];

            // Empty values stay at the bottom for both directions.
            if (isEmpty(valueA) || isEmpty(valueB)) {
                return isEmpty(valueA) === isEmpty(valueB)
                    ? 0
                    : isEmpty(valueA)
                        ? 1
                        : -1;
            }

            return compareValues(valueA, valueB, column) * direction;
        });
    }, [data, columns, sort]);

    function handleSort(column: DashboardColumn<T>) {
        if (column.sortable === false) return;

        const key = String(column.key);

        setSort((current) => ({
            key,
            direction:
                current?.key === key && current.direction === "asc"
                    ? "desc"
                    : "asc",
        }));
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white">
            <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full min-w-[900px] border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            {columns.map((column) => {
                                const key = String(column.key);
                                const isSortable = column.sortable !== false;
                                const isSorted = sort?.key === key;

                                return (
                                    <th
                                        key={key}
                                        aria-sort={
                                            isSorted
                                                ? sort.direction === "asc"
                                                    ? "ascending"
                                                    : "descending"
                                                : "none"
                                        }
                                        className={[
                                            "px-4 py-3 text-left text-xs font-semibold text-gray-600",
                                            column.className ?? "",
                                        ].join(" ")}
                                    >
                                        {isSortable ? (
                                            <button
                                                type="button"
                                                onClick={() => handleSort(column)}
                                                className="cursor-pointer text-left hover:text-gray-900 focus-visible:outline-none focus-visible:underline"
                                                title={`Sort by ${column.label} `}
                                            >
                                                {column.label}
                                            </button>
                                        ) : (
                                            column.label
                                        )}
                                    </th>
                                );
                            })}

                            {renderActions && (
                                <th className="sticky right-0 z-10 whitespace-nowrap bg-gray-50 px-4 py-3 text-right text-xs font-semibold text-gray-600">
                                    ACTIONS
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {sortedData.map((row) => (
                            <tr
                                key={getRowKey(row)}
                                className="group border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                            >
                                {columns.map((column) => (
                                    <td
                                        key={String(column.key)}
                                        className="px-4 py-3 text-sm text-gray-700"
                                    >
                                        {column.render
                                            ? column.render(row)
                                            : String(
                                                (
                                                    row as Record<
                                                        string,
                                                        unknown
                                                    >
                                                )[String(column.key)] ?? "-",
                                            )}
                                    </td>
                                ))}

                                {renderActions && (
                                    <td className="sticky right-0 z-10 whitespace-nowrap bg-white px-4 py-3 group-hover:bg-gray-50">
                                        {renderActions(row)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
