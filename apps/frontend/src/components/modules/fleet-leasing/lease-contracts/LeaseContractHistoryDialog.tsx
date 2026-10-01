"use client";

import Button from "@/components/ui/GrubpacButton";

export type LeaseContractLogEntry = {
    id: string;
    message: string;
    occurredAt: string;
    actorLabel?: string | null;
};

interface LeaseContractHistoryDialogProps {
    isOpen: boolean;
    contractNumber: string;
    logs: LeaseContractLogEntry[];
    onClose: () => void;
}

function formatLogWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    } catch {
        return iso;
    }
}

export default function LeaseContractHistoryDialog({
    isOpen,
    contractNumber,
    logs,
    onClose,
}: LeaseContractHistoryDialogProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lease-contract-history-title"
        >
            <div className="flex max-h-[min(80vh,560px)] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
                <div className="border-b border-slate-100 px-6 py-4">
                    <h2
                        id="lease-contract-history-title"
                        className="text-base font-semibold text-slate-900"
                    >
                        Change history — {contractNumber}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Lifecycle and audit events for this contract.
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    {logs.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            No history entries yet.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {logs.map((entry) => (
                                <li
                                    key={entry.id}
                                    className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                                >
                                    <p className="text-sm text-slate-800">
                                        {entry.message}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {formatLogWhen(entry.occurredAt)}
                                        {entry.actorLabel
                                            ? ` · ${entry.actorLabel}`
                                            : ""}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex justify-end border-t border-slate-100 px-6 py-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}
