"use client";

import { Plus, X } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

export type LocationType = {
    id: string;
    name: string;
    isCustom: boolean;
    isUsed: boolean;
};

type LocationTypeSelectorProps = {
    locationTypes: LocationType[];
    selectedType: string;
    showAddType: boolean;
    newType: string;
    error?: string;
    onSelect: (type: string) => void;
    onToggleAddType: () => void;
    onNewTypeChange: (value: string) => void;
    onAddType: () => void;
    onDeleteType: (type: LocationType) => void;
};

export default function LocationTypeSelector({
    locationTypes,
    selectedType,
    showAddType,
    newType,
    error,
    onSelect,
    onToggleAddType,
    onNewTypeChange,
    onAddType,
    onDeleteType,
}: LocationTypeSelectorProps) {
    return (
        <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold text-gray-700">
                TYPE
                <span className="ml-1 text-red-500">
                    *
                </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
                {locationTypes.map((type) => {
                    const selected =
                        selectedType === type.name;

                    return (
                        <div
                            key={type.id}
                            className="relative"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    onSelect(type.name)
                                }
                                className={[
                                    "h-9 rounded-md border px-4 text-sm font-semibold transition",
                                    selected
                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                                ].join(" ")}
                            >
                                {type.name}
                            </button>

                            {type.isCustom && (
                                <button
                                    type="button"
                                    disabled={type.isUsed}
                                    onClick={() =>
                                        onDeleteType(type)
                                    }
                                    title={
                                        type.isUsed
                                            ? "This type is already used by a location"
                                            : "Delete location type"
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

                <button
                    type="button"
                    onClick={onToggleAddType}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 text-sm font-semibold text-gray-600 transition hover:border-gray-400 hover:bg-gray-50"
                >
                    <Plus className="h-4 w-4" />
                    Add Type
                </button>
            </div>

            {error && (
                <p className="mt-1 text-xs text-red-500">
                    {error}
                </p>
            )}

            {showAddType && (
                <div className="mt-3 flex max-w-md items-center gap-2">
                    <input
                        type="text"
                        value={newType}
                        onChange={(event) =>
                            onNewTypeChange(event.target.value)
                        }
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                onAddType();
                            }
                        }}
                        autoFocus
                        placeholder="Enter new location type"
                        className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                    />

                    <Button
                        type="button"
                        onClick={onAddType}
                        className="h-9 px-4"
                    >
                        Add
                    </Button>

                    <button
                        type="button"
                        onClick={() => {
                            onNewTypeChange("");
                            onToggleAddType();
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