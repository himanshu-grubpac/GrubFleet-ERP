"use client";

import { AlertTriangle, Info } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

export type LeaseContractAction =
    | "deactivate"
    | "reactivate"
    | "terminate";

interface LeaseContractActionModalProps {
    isOpen: boolean;
    action: LeaseContractAction;
    contractNumber: string;
    onClose: () => void;
    onConfirm: () => void;
}

export default function LeaseContractActionModal({
    isOpen,
    action,
    contractNumber,
    onClose,
    onConfirm,
}: LeaseContractActionModalProps) {
    if (!isOpen) {
        return null;
    }

    const config = {
        deactivate: {
            title: `Deactivate contract ${contractNumber}?`,
            description:
                "The contract will be put on hold. Billing continues as normal until all vehicles on this contract have been returned and registered — pausing billing is a separate step, available once that's true.",
            confirmText: "Deactivate",
            icon: AlertTriangle,
        },

        reactivate: {
            title: "Request reactivation?",
            description:
                "Reactivating a contract always needs approval — there's no automatic or timer-based return to Active, however long it's sat Deactivated.",
            confirmText: "Request reactivation",
            icon: Info,
        },

        terminate: {
            title: `Terminate contract ${contractNumber}?`,
            description:
                "This needs Contract Admin approval. Once approved, the security deposit is settled immediately — there's no grace period, unlike a naturally-concluding contract, which can sit unsettled until inspection clears.",
            confirmText: "Request termination",
            icon: AlertTriangle,
        },
    }[action];

    const Icon = config.icon;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lease-contract-action-title"
        >
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">

                {/* =================================================
                    MODAL CONTENT
                ================================================= */}

                <div className="px-6 pt-6">
                    <div className="flex items-start gap-3">

                        {/* ICON */}

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50">
                            <Icon className="h-5 w-5 text-[#FE5720]" />
                        </div>

                        {/* TITLE + DESCRIPTION */}

                        <div className="min-w-0">
                            <h2
                                id="lease-contract-action-title"
                                className="text-base font-semibold text-slate-900"
                            >
                                {config.title}
                            </h2>

                            <p className="mt-1.5 text-sm leading-5 text-slate-500">
                                {config.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* =================================================
                    MODAL ACTIONS
                ================================================= */}

                <div className="flex justify-end gap-3 px-6 py-5">

                    {/* CANCEL — SECONDARY */}

                    <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    {/* CONFIRM — PRIMARY */}

                    <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={onConfirm}
                    >
                        {config.confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}