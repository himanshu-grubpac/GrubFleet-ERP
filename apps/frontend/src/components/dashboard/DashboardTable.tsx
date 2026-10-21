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
    /**
     * @deprecated No longer has any effect. Row action menus render in a
     * portal (see DashboardRowActionsMenu), so the scroll container no
     * longer needs to allow overflow. Kept so existing callers still compile.
     */
    allowOverflow?: boolean;
};

export default function DashboardTable<T>({
    columns,
    data,
    getRowKey,
    renderActions,
}: DashboardTableProps<T>) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white">
            <div className="w-full overflow-x-auto">
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
                                <th className="sticky right-0 z-10 whitespace-nowrap bg-gray-50 px-4 py-3 text-right text-xs font-semibold text-gray-600">
                                    ACTIONS
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {data.map((row) => (
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
                                                )[String(column.key)] ?? "-"
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