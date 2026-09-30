"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import Button from "@/components/ui/GrubpacButton";

export type ReasonRequiredDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  /** Server or mutation errors — not used for empty required reason (primary stays disabled). */
  error?: string | null;
  onClose: () => void;
  onConfirm: (trimmedReason: string) => void;
};

export function ReasonRequiredDialog({
  open,
  title,
  description,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter a reason",
  confirmLabel = "Confirm",
  pendingLabel,
  cancelLabel = "Cancel",
  isPending = false,
  error = null,
  onClose,
  onConfirm,
}: ReasonRequiredDialogProps) {
  const titleId = useId();
  const reasonFieldId = useId();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isPending, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const trimmedReason = reason.trim();
  const confirmDisabled = isPending || trimmedReason.length === 0;

  const handleBackdropClick = () => {
    if (!isPending) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <h2
            id={titleId}
            className="text-base font-semibold text-gray-900"
          >
            {title}
          </h2>
          <div className="mt-2 text-sm text-gray-600">{description}</div>

          <label
            htmlFor={reasonFieldId}
            className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-700"
          >
            {reasonLabel}{" "}
            <span className="text-[#FE5720]" aria-hidden>
              *
            </span>
          </label>
          <textarea
            id={reasonFieldId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
            placeholder={reasonPlaceholder}
            aria-required
          />

          {error ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <Button
            type="button"
            disabled={confirmDisabled}
            loading={isPending}
            onClick={() => onConfirm(trimmedReason)}
          >
            {isPending
              ? (pendingLabel ?? confirmLabel)
              : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
