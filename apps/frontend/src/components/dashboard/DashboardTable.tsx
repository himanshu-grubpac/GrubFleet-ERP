"use client";

import React from "react";

export type DashboardColumn<T> = {
    key: keyof T | string;
    label: string;
    render?: (row: T) => React.ReactNode;
    className?: string;
};

type DashboardTableProps<T> = {
    columns: DashboardColumn<T>[];
    data: T[];
    getRowKey: (row: T) => string;
    renderActions?: (row: T) => React.ReactNode;
};

export default function DashboardTable<T>({
    columns,
    data,
    getRowKey,
    renderActions,
}: DashboardTableProps<T>) {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div
                className="
                    w-full
                    overflow-x-auto
                    overflow-y-clip
                    [scrollbar-width:none]
                    [-ms-overflow-style:none]
                    [&::-webkit-scrollbar]:hidden
                "
            >
                <table className="w-full min-w-[900px] border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            {columns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    className={[
                                        "px-4 py-3 text-left text-xs font-semibold text-gray-600",
                                        column.className ?? "",
                                    ].join(" ")}
                                >
                                    {column.label}
                                </th>
                            ))}

                            {renderActions && (
                                <th className="w-[150px] px-4 py-3 text-right text-xs font-semibold text-gray-600">
                                    ACTIONS
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {data.map((row) => (
                            <tr
                                key={getRowKey(row)}
                                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                            >
                                {columns.map((column) => (
                                    <td
                                        key={String(column.key)}
                                        className="px-4 py-3 text-sm text-gray-700"
                                    >
                                        {column.render
                                            ? column.render(row)
                                            : String(
                                                (row as Record<string, unknown>)[
                                                String(column.key)
                                                ] ?? "-"
                                            )}
                                    </td>
                                ))}

                                {renderActions && (
                                    <td className="px-4 py-3">
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