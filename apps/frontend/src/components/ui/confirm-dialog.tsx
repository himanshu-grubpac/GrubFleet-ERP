"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isConfirmPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isConfirmPending = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isConfirmPending) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isConfirmPending, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const handleBackdropClick = () => {
    if (!isConfirmPending) {
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
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <h2
            id={titleId}
            className="text-base font-semibold text-slate-900"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-5 text-slate-600">{message}</p>
        </div>
        <div className="flex justify-end gap-2 px-6 py-5">
          <Button
            type="button"
            variant="grayOutline"
            size="md"
            disabled={isConfirmPending}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          {variant === "destructive" ? (
            <button
              type="button"
              disabled={isConfirmPending}
              onClick={onConfirm}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConfirmPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {confirmLabel}
                </>
              ) : (
                confirmLabel
              )}
            </button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={isConfirmPending}
              disabled={isConfirmPending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
