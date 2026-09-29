"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

type LocationType = {
    id: string;
    name: string;
    isCustom: boolean;
    isUsed: boolean;
};

type LocationTypeSelectorProps = {
    value: string;
    onChange: (value: string) => void;
};

const DEFAULT_LOCATION_TYPES: LocationType[] = [
    {
        id: "office",
        name: "Office",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "workshop",
        name: "Workshop",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "warehouse",
        name: "Warehouse",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "retail-outlet",
        name: "Retail Outlet",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "other",
        name: "Other",
        isCustom: false,
        isUsed: false,
    },
];

/*
 * TEMPORARY MOCK DATA
 *
 * Later these types should come from the backend.
 *
 * isUsed should ultimately be determined by the backend
 * based on whether any Location is using that type.
 */
const MOCK_CUSTOM_TYPES: LocationType[] = [
    {
        id: "cold-storage",
        name: "Cold Storage",
        isCustom: true,
        isUsed: false,
    },
];

export default function LocationTypeSelector({
    value,
    onChange,
}: LocationTypeSelectorProps) {
    const [customTypes, setCustomTypes] =
        useState<LocationType[]>(MOCK_CUSTOM_TYPES);

    const [showAddType, setShowAddType] =
        useState(false);

    const [newType, setNewType] =
        useState("");

    const allTypes = [
        ...DEFAULT_LOCATION_TYPES,
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

        const customType: LocationType = {
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

        /*
         * Automatically select the newly created type.
         */
        onChange(trimmedName);
    };

    const handleDeleteType = (
        type: LocationType
    ) => {
        /*
         * Frontend protection.
         *
         * Backend must enforce this rule when
         * the real API is connected.
         */
        if (!type.isCustom || type.isUsed) {
            return;
        }

        /*
         * If the deleted type is currently selected,
         * clear the selection.
         */
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
            {/* Type buttons */}

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
                                    "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
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
                                            ? "This type is already used by a location"
                                            : "Delete type"
                                    }
                                    className={[
                                        "absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border text-[10px]",
                                        type.isUsed
                                            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300"
                                            : "border-gray-300 bg-white text-gray-500 hover:border-red-300 hover:text-red-500",
                                    ].join(" ")}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Add custom type */}

                <button
                    type="button"
                    onClick={() =>
                        setShowAddType((previous) => !previous)
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                >
                    <Plus className="h-4 w-4" />
                    Add Type
                </button>
            </div>

            {/* Add custom type input */}

            {showAddType && (
                <div className="flex max-w-md items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
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
                        placeholder="Enter location type"
                        autoFocus
                        className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                        title="Cancel"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}