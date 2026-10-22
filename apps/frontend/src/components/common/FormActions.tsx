"use client";

import Button from "@/components/ui/GrubpacButton";

type FormActionsProps = {
    hasAttemptedSubmit: boolean;
    validationSummary: string[];
    isSaving: boolean;
    canSubmit?: boolean;
    onCancel: () => void;
    onSave: () => void | Promise<void>;
    saveLabel: string;
    savingLabel?: string;
    cancelLabel?: string;
    secondaryAction?: {
        label: string;
        onClick: () => void;
        disabled?: boolean;
        isPending?: boolean;
        pendingLabel?: string;
    };
};

export default function FormActions({
    hasAttemptedSubmit,
    validationSummary,
    isSaving,
    canSubmit = true,
    onCancel,
    onSave,
    saveLabel,
    savingLabel = "Saving...",
    cancelLabel = "Cancel",
    secondaryAction,
}: FormActionsProps) {
    const secondaryPending = Boolean(secondaryAction?.isPending);

    return (
        <div className="flex w-full flex-col items-stretch gap-4">
            {hasAttemptedSubmit && validationSummary.length > 0 && (
                <div
                    role="status"
                    aria-live="polite"
                    className="block w-full self-start text-left text-xs leading-5 text-red-600"
                >
                    <span className="font-semibold">Please fix:</span>{" "}
                    {validationSummary.join(" | ")}
                </div>
            )}

            <div className="flex w-full items-center justify-between gap-3">
                {/* Back stays on the left */}
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving || secondaryPending}
                    className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {cancelLabel}
                </button>

                {/* Save draft and Continue stay on the right */}
                <div className="flex items-center gap-3">
                    {secondaryAction ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={secondaryAction.onClick}
                            disabled={
                                secondaryAction.disabled ||
                                isSaving ||
                                secondaryPending
                            }
                            className="h-10 px-5"
                        >
                            {secondaryPending && secondaryAction.pendingLabel
                                ? secondaryAction.pendingLabel
                                : secondaryAction.label}
                        </Button>
                    ) : null}

                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => void onSave()}
                        disabled={isSaving || secondaryPending}
                        className="h-10 px-5"
                    >
                        {isSaving ? savingLabel : saveLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
