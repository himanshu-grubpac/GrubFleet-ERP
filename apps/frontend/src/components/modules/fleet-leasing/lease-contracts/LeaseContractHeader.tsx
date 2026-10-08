"use client";

import { useState } from "react";
import Link from "next/link";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { leaseStatusPillClass } from "@/lib/lease-contract/lease-contract-status-display";

interface LeaseContractHeaderProps {
    contractNumber: string;
    /** Public status label from API (e.g. Awaiting Assets). */
    statusLabel: string;
    description: string;

    onActivate?: () => void;
    onDeactivate?: (reason: string) => void;
    onReactivate?: () => void;
    onTerminate?: () => void;
    onPauseBilling?: () => void;
    onEdit?: () => void;
    historyHref?: string;
    isActionPending?: boolean;
}

export default function LeaseContractHeader({
    contractNumber,
    statusLabel,
    description,
    onActivate,
    onDeactivate,
    onReactivate,
    onTerminate,
    onPauseBilling,
    onEdit,
    historyHref,
    isActionPending = false,
}: LeaseContractHeaderProps) {
    const [activateOpen, setActivateOpen] = useState(false);
    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [reactivateOpen, setReactivateOpen] = useState(false);
    const [terminateOpen, setTerminateOpen] = useState(false);
    const [pauseBillingOpen, setPauseBillingOpen] = useState(false);

    const statusPillClass = leaseStatusPillClass(statusLabel);

    const closeAll = () => {
        if (isActionPending) return;
        setActivateOpen(false);
        setDeactivateOpen(false);
        setReactivateOpen(false);
        setTerminateOpen(false);
        setPauseBillingOpen(false);
    };

    const showReactivate = Boolean(onReactivate);
    const showDeactivate = Boolean(onDeactivate);

    return (
        <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h1 className="text-[15px] font-semibold text-gray-900">
                            {contractNumber}
                        </h1>
                        <span
                            className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass}`}
                        >
                            {statusLabel}
                        </span>
                    </div>
                    {description ? (
                        <p className="mt-1 text-sm text-gray-500">
                            {description}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {historyHref ? (
                        <Link
                            href={historyHref}
                            className="inline-flex h-10 items-center px-2 text-sm font-medium text-[#FE5720] hover:underline"
                        >
                            View history
                        </Link>
                    ) : null}

                    {onEdit ? (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onEdit}
                            disabled={isActionPending}
                        >
                            Edit
                        </Button>
                    ) : null}

                    {onPauseBilling ? (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setPauseBillingOpen(true)}
                            disabled={isActionPending}
                        >
                            Pause billing
                        </Button>
                    ) : null}

                    {onTerminate ? (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setTerminateOpen(true)}
                            disabled={isActionPending}
                        >
                            Terminate
                        </Button>
                    ) : null}

                    {showDeactivate ? (
                        <Button
                            type="button"
                            onClick={() => setDeactivateOpen(true)}
                            disabled={isActionPending}
                        >
                            Deactivate
                        </Button>
                    ) : null}

                    {onActivate ? (
                        <Button
                            type="button"
                            onClick={() => setActivateOpen(true)}
                            disabled={isActionPending}
                        >
                            Activate
                        </Button>
                    ) : null}

                    {showReactivate ? (
                        <Button
                            type="button"
                            onClick={() => setReactivateOpen(true)}
                            disabled={isActionPending}
                        >
                            Reactivate
                        </Button>
                    ) : null}
                </div>
            </div>

            <ConfirmDialog
                open={activateOpen}
                title="Activate contract?"
                message="This contract will become Active or Awaiting Assets per allocation."
                confirmLabel="Activate"
                isConfirmPending={isActionPending}
                onClose={closeAll}
                onConfirm={() => {
                    onActivate?.();
                    setActivateOpen(false);
                }}
            />

            <ReasonRequiredDialog
                open={deactivateOpen}
                title="Deactivate contract?"
                description={
                    <>
                        <span className="font-medium text-gray-900">
                            {contractNumber}
                        </span>{" "}
                        will be put on hold. Billing continues as normal until
                        all vehicles on this contract have been returned and
                        registered.
                    </>
                }
                reasonLabel="Reason for deactivation"
                confirmLabel="Deactivate"
                isPending={isActionPending}
                onClose={closeAll}
                onConfirm={(reason) => {
                    onDeactivate?.(reason);
                    setDeactivateOpen(false);
                }}
            />

            <ConfirmDialog
                open={reactivateOpen}
                title="Reactivate contract?"
                message={`${contractNumber} will return to Active or Awaiting Assets per allocation.`}
                confirmLabel="Reactivate"
                isConfirmPending={isActionPending}
                onClose={closeAll}
                onConfirm={() => {
                    onReactivate?.();
                    setReactivateOpen(false);
                }}
            />

            <ConfirmDialog
                open={terminateOpen}
                title="Terminate contract?"
                message={`${contractNumber} will be closed and the security deposit settled immediately.`}
                confirmLabel="Terminate"
                variant="destructive"
                isConfirmPending={isActionPending}
                onClose={closeAll}
                onConfirm={() => {
                    onTerminate?.();
                    setTerminateOpen(false);
                }}
            />

            <ConfirmDialog
                open={pauseBillingOpen}
                title="Pause billing?"
                message="Billing will pause once all vehicles are returned and registered on this contract."
                confirmLabel="Pause billing"
                isConfirmPending={isActionPending}
                onClose={closeAll}
                onConfirm={() => {
                    onPauseBilling?.();
                    setPauseBillingOpen(false);
                }}
            />

        </>
    );
}
