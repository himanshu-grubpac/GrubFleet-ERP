"use client";

import { useState } from "react";

import {
    Pencil,
    Power,
    RotateCcw,
    XCircle,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

import LeaseContractActionModal, {
    type LeaseContractAction,
} from "./LeaseContractActionModal";

export type LeaseContractStatus =
    | "Draft"
    | "Active"
    | "Deactivated"
    | "Terminated";

interface LeaseContractHeaderProps {
    contractNumber: string;
    status: LeaseContractStatus;
    description: string;

    onActivate?: () => void;
    onDeactivate?: () => void;
    onReactivate?: () => void;
    onTerminate?: () => void;
    onEdit?: () => void;
}

export default function LeaseContractHeader({
    contractNumber,
    status,
    description,
    onActivate,
    onDeactivate,
    onReactivate,
    onTerminate,
    onEdit,
}: LeaseContractHeaderProps) {
    const [activeModal, setActiveModal] =
        useState<LeaseContractAction | null>(null);

    const statusClasses = {
        Draft: "bg-amber-100 text-amber-700",
        Active: "bg-green-100 text-green-700",
        Deactivated: "bg-slate-100 text-slate-700",
        Terminated: "bg-red-100 text-red-700",
    };

    const closeModal = () => {
        setActiveModal(null);
    };

    const handleConfirm = () => {
        if (activeModal === "deactivate") {
            onDeactivate?.();
        }

        if (activeModal === "reactivate") {
            onReactivate?.();
        }

        if (activeModal === "terminate") {
            onTerminate?.();
        }

        setActiveModal(null);
    };

    return (
        <>
            <div className="flex items-start justify-between gap-6">

                {/* =================================================
                    CONTRACT INFORMATION
                ================================================= */}

                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">
                            {contractNumber}
                        </h1>

                        <span
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
                        >
                            {status}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                        {description}
                    </p>
                </div>

                {/* =================================================
                    ACTION BUTTONS
                ================================================= */}

                <div className="flex shrink-0 items-center gap-3">

                    {/* =================================================
                        DRAFT → ACTIVATE
                    ================================================= */}

                    {status === "Draft" && onActivate && (
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            leftIcon={<Power className="h-4 w-4" />}
                            onClick={onActivate}
                        >
                            Activate
                        </Button>
                    )}

                    {/* =================================================
                        ACTIVE → DEACTIVATE
                    ================================================= */}

                    {status === "Active" && onDeactivate && (
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            leftIcon={<Power className="h-4 w-4" />}
                            onClick={() => setActiveModal("deactivate")}
                        >
                            Deactivate
                        </Button>
                    )}

                    {/* =================================================
                        DEACTIVATED → TERMINATE + REACTIVATE
                    ================================================= */}

                    {status === "Deactivated" && (
                        <>
                            {/* TERMINATE — SECONDARY */}

                            {onTerminate && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="md"
                                    leftIcon={
                                        <XCircle className="h-4 w-4" />
                                    }
                                    onClick={() =>
                                        setActiveModal("terminate")
                                    }
                                >
                                    Terminate
                                </Button>
                            )}

                            {/* REACTIVATE — PRIMARY */}

                            {onReactivate && (
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="md"
                                    leftIcon={
                                        <RotateCcw className="h-4 w-4" />
                                    }
                                    onClick={() =>
                                        setActiveModal("reactivate")
                                    }
                                >
                                    Reactivate
                                </Button>
                            )}
                        </>
                    )}

                    {/* =================================================
                        EDIT CONTRACT — SECONDARY
                    ================================================= */}

                    {status !== "Terminated" && onEdit && (
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            leftIcon={<Pencil className="h-4 w-4" />}
                            onClick={onEdit}
                        >
                            Edit contract
                        </Button>
                    )}
                </div>
            </div>

            {/* =====================================================
                ACTION CONFIRMATION MODAL
            ====================================================== */}

            <LeaseContractActionModal
                isOpen={activeModal !== null}
                action={activeModal ?? "deactivate"}
                contractNumber={contractNumber}
                onClose={closeModal}
                onConfirm={handleConfirm}
            />
        </>
    );
}