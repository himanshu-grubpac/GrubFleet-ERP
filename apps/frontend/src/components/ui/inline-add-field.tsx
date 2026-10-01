"use client";

import type { KeyboardEvent } from "react";
import { X } from "lucide-react";

import GrubpacButton from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { cn } from "@/lib/utils";
import type { RestrictedInputKind } from "@/lib/forms/restricted-input";

/**
 * Inline "Add" row for chip/catalog creators (department, location type, etc.).
 * Primary Add stays disabled (gray) until trimmed value is non-empty and not pending —
 * same bar as form `canSubmit` (rules 24 §6a, 29).
 */
export type InlineAddFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void | Promise<void>;
  isPending?: boolean;
  placeholder?: string;
  restrictedKind?: RestrictedInputKind;
  maxLength: number;
  error?: string;
  /** `row` = input + actions only; `panel` = gray bordered container */
  layout?: "row" | "panel";
  inputClassName?: string;
  className?: string;
  addButtonLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
};

export function InlineAddField({
  value,
  onChange,
  onAdd,
  isPending = false,
  placeholder,
  restrictedKind = "text",
  maxLength,
  error,
  layout = "row",
  inputClassName,
  className,
  addButtonLabel = "Add",
  onCancel,
  autoFocus,
}: InlineAddFieldProps) {
  const canAdd = value.trim().length > 0 && !isPending;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (canAdd) {
        void onAdd();
      }
    }
  };

  const defaultInputClass =
    "h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

  const actionsRow = (
    <div className="flex items-center gap-2">
      <RestrictedInput
        restrictedKind={restrictedKind}
        maxLength={maxLength}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={isPending}
        className={cn(defaultInputClass, inputClassName)}
      />

      <GrubpacButton
        type="button"
        disabled={!canAdd}
        onClick={() => void onAdd()}
        className="h-9 shrink-0 px-4"
      >
        {addButtonLabel}
      </GrubpacButton>

      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  const errorNode = error ? (
    <p className="text-xs text-red-600" role="alert">
      {error}
    </p>
  ) : null;

  if (layout === "panel") {
    return (
      <div
        className={cn(
          "flex max-w-md flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3",
          className,
        )}
      >
        {actionsRow}
        {errorNode}
      </div>
    );
  }

  return (
    <div className={cn("flex max-w-md flex-col gap-2", className)}>
      {actionsRow}
      {errorNode}
    </div>
  );
}
