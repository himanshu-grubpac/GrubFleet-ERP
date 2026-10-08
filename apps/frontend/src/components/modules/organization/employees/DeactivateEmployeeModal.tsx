"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import Button from "@/components/ui/GrubpacButton";
import type { DeactivateReasonType, EmployeeRecord } from "./types";
import { DEACTIVATE_REASON_LABELS } from "./types";

const DEACTIVATE_COMMENT_MAX = 2000;

const REASON_OPTIONS: DeactivateReasonType[] = [
  "resignation",
  "termination",
  "end_of_contract",
  "other",
];

type DeactivateEmployeeModalProps = {
  employee: EmployeeRecord | null;
  isPending?: boolean;
  error?: string | null;
  onClose: () => void;
  onDeactivate: (input: {
    reasonType: DeactivateReasonType;
    comment?: string;
  }) => void;
};

export default function DeactivateEmployeeModal({
  employee,
  isPending = false,
  error = null,
  onClose,
  onDeactivate,
}: DeactivateEmployeeModalProps) {
  const titleId = useId();
  const [reasonType, setReasonType] = useState<DeactivateReasonType | "">("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!employee) {
      setReasonType("");
      setComment("");
      setFormError(null);
    }
  }, [employee]);

  useEffect(() => {
    if (!employee) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [employee, onClose, isPending]);

  if (!employee || typeof document === "undefined") {
    return null;
  }

  const canConfirm = reasonType !== "";

  const handleConfirm = () => {
    if (!canConfirm) return;
    setFormError(null);
    onDeactivate({
      reasonType: reasonType as DeactivateReasonType,
      comment: comment.trim() || undefined,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onMouseDown={isPending ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <>
            <div className="px-6 pt-6">
              <h2
                id={titleId}
                className="text-base font-semibold text-gray-900"
              >
                Deactivate employee?
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {employee.fullName}
                </span>{" "}
                will be marked inactive. Select a reason and optionally add a
                comment ΓÇö the record stays in the register.
              </p>

              <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                Reason *
              </label>
              <div className="flex flex-wrap gap-2">
                {REASON_OPTIONS.map((option) => {
                  const selected = reasonType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isPending}
                      onClick={() => setReasonType(option)}
                      className={[
                        "rounded-md border px-3 py-2 text-sm font-medium transition",
                        selected
                          ? "border-[#FE5720] bg-[#FE5720]/5 text-[#FE5720]"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400",
                      ].join(" ")}
                    >
                      {DEACTIVATE_REASON_LABELS[option]}
                    </button>
                  );
                })}
              </div>

              <label
                htmlFor="employee-deactivate-comment"
                className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-700"
              >
                Comment (optional)
              </label>
              <textarea
                id="employee-deactivate-comment"
                value={comment}
                disabled={isPending}
                onChange={(event) =>
                  setComment(event.target.value.slice(0, DEACTIVATE_COMMENT_MAX))
                }
                maxLength={DEACTIVATE_COMMENT_MAX}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                placeholder="Additional context for HR or audit"
              />

              {(error || formError) && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {error ?? formError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-5">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <Button
                type="button"
                disabled={!canConfirm || isPending}
                loading={isPending}
                onClick={handleConfirm}
              >
                {isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>
        </>
      </div>
    </div>,
    document.body,
  );
}
