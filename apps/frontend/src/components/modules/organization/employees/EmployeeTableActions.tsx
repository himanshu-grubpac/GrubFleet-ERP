"use client";

import {
    Copy,
    Pencil,
    Power,
} from "lucide-react";

type EmployeeTableActionsProps = {
    status: "active" | "inactive";
    onCopy: () => void;
    onEdit: () => void;
    onToggleStatus: () => void;
};

export default function EmployeeTableActions({
    status,
    onCopy,
    onEdit,
    onToggleStatus,
}: EmployeeTableActionsProps) {
    return (
        <div className="flex items-center justify-end gap-1">
            {/* Copy */}
            <button
                type="button"
                onClick={onCopy}
                title="Copy employee ID"
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
                <Copy
                    className="h-4 w-4"
                    strokeWidth={1.7}
                />
            </button>

            {/* Edit */}
            <button
                type="button"
                onClick={onEdit}
                title="Edit employee"
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
                <Pencil
                    className="h-4 w-4"
                    strokeWidth={1.7}
                />
            </button>

            {/* Activate / Deactivate */}
            <button
                type="button"
                onClick={onToggleStatus}
                title={
                    status === "active"
                        ? "Deactivate employee"
                        : "Activate employee"
                }
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
                <Power
                    className="h-4 w-4"
                    strokeWidth={1.7}
                />
            </button>
        </div>
    );
}