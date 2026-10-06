"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export type SupplierType = {
    id: string;
    name: string;
    isCustom: boolean;
    isUsed: boolean;
};

type SupplierTypeSelectorProps = {
    value: string;
    onChange: (value: string) => void;
};

const DEFAULT_SUPPLIER_TYPES: SupplierType[] = [
    {
        id: "vehicles",
        name: "Vehicles",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "parts",
        name: "Parts",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "drivers",
        name: "Drivers",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "compliance",
        name: "Compliance",
        isCustom: false,
        isUsed: false,
    },
];

/*
 * TEMPORARY MOCK DATA
 *
 * Later these supplier types can come from the backend.
 */
const MOCK_CUSTOM_SUPPLIER_TYPES: SupplierType[] = [];

export default function SupplierTypeSelector({
    value,
    onChange,
}: SupplierTypeSelectorProps) {
    const [customTypes, setCustomTypes] = useState<SupplierType[]>(
        MOCK_CUSTOM_SUPPLIER_TYPES
    );

    const [showAddType, setShowAddType] = useState(false);
    const [newType, setNewType] = useState("");

    const allTypes = [
        ...DEFAULT_SUPPLIER_TYPES,
        ...customTypes,
    ];

    const handleAddType = () => {
        const trimmedName = newType.trim();

        if (!trimmedName) {
            return;
        }

        const alreadyExists = allTypes.some(
            (type) =>
                type.name.toLowerCase() ===
                trimmedName.toLowerCase()
        );

        if (alreadyExists) {
            return;
        }

        const customType: SupplierType = {
            id: `custom-${Date.now()}`,
            name: trimmedName,
            isCustom: true,
            isUsed: false,
        };

        setCustomTypes((previous) => [
            ...previous,
            customType,
        ]);

        setNewType("");
        setShowAddType(false);

        // Automatically select the newly created type
        onChange(trimmedName);
    };

    const handleDeleteType = (type: SupplierType) => {
        /*
         * Do not allow deletion of:
         * - default supplier types
         * - supplier types already in use
         */
        if (!type.isCustom || type.isUsed) {
            return;
        }

        if (value === type.name) {
            onChange("");
        }

        setCustomTypes((previous) =>
            previous.filter(
                (item) => item.id !== type.id
            )
        );
    };

    return (
        <div className="space-y-3">
            {/* Supplier Type Buttons */}

            <div className="flex flex-wrap items-center gap-2">
                {allTypes.map((type) => {
                    const isSelected =
                        value === type.name;

                    return (
                        <div
                            key={type.id}
                            className="relative"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    onChange(type.name)
                                }
                                className={[
                                    "h-9 rounded-md border px-4 text-sm font-semibold transition",
                                    isSelected
                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                                ].join(" ")}
                            >
                                {type.name}
                            </button>

                            {/* Delete custom type */}

                            {type.isCustom && (
                                <button
                                    type="button"
                                    disabled={type.isUsed}
                                    onClick={() =>
                                        handleDeleteType(type)
                                    }
                                    title={
                                        type.isUsed
                                            ? "This supplier type is already in use"
                                            : "Delete supplier type"
                                    }
                                    className={[
                                        "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-sm",
                                        type.isUsed
                                            ? "cursor-not-allowed border-gray-200 text-gray-300"
                                            : "border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500",
                                    ].join(" ")}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Add Type */}

                <button
                    type="button"
                    onClick={() =>
                        setShowAddType(
                            (previous) => !previous
                        )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 text-sm font-semibold text-gray-600 transition hover:border-gray-400 hover:bg-gray-50"
                >
                    <Plus className="h-4 w-4" />
                    Add Type
                </button>
            </div>

            {/* Add Type Input */}

            {showAddType && (
                <div className="mt-3 flex max-w-md items-center gap-2">
                    <input
                        type="text"
                        value={newType}
                        onChange={(event) =>
                            setNewType(event.target.value)
                        }
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                handleAddType();
                            }
                        }}
                        autoFocus
                        placeholder="Enter new supplier type"
                        className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                    />

                    <button
                        type="button"
                        onClick={handleAddType}
                        className="h-9 rounded-md bg-[#FE5720] px-4 text-sm font-medium text-white hover:opacity-90"
                    >
                        Add
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setNewType("");
                            setShowAddType(false);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
                        title="Cancel"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}