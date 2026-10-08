"use client";

import { useCallback, useState } from "react";

import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";

export type InlineAddFieldProps = {
    placeholder?: string;
    maxLength?: number;
    buttonLabel?: string;
    isPending?: boolean;
    disabled?: boolean;
    onAdd: (trimmedValue: string) => void | Promise<void>;
    className?: string;
};

/**
 * Combobox/catalog inline create — primary disabled until non-empty trim and not pending.
 * Use with backend inline-create DTO max lengths.
 */
export default function InlineAddField({
    placeholder = "Add new…",
    maxLength = 255,
    buttonLabel = "Add",
    isPending = false,
    disabled = false,
    onAdd,
    className = "",
}: InlineAddFieldProps) {
    const [value, setValue] = useState("");

    const trimmed = value.trim();
    const canAdd =
        !disabled && !isPending && trimmed.length > 0 && trimmed.length <= maxLength;

    const handleAdd = useCallback(async () => {
        if (!canAdd) return;
        await onAdd(trimmed);
        setValue("");
    }, [canAdd, onAdd, trimmed]);

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
            <RestrictedInput
                restrictedKind="text"
                maxLength={maxLength}
                value={value}
                onChange={setValue}
                placeholder={placeholder}
                disabled={disabled || isPending}
                className="min-w-[12rem] flex-1"
            />
            <Button
                type="button"
                variant="primary"
                disabled={!canAdd}
                onClick={() => void handleAdd()}
            >
                {isPending ? "Adding…" : buttonLabel}
            </Button>
        </div>
    );
}
