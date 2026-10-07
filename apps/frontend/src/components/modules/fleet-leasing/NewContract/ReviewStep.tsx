"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/GrubpacButton";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
    confirmLeaseContract,
    fetchLeaseContractReview,
    type LeaseContractReviewAssetLine,
} from "@/lib/api/lease-contracts";
import { ApiClientError } from "@/lib/api/client";
import { formatIndianRupee } from "@/lib/format/currency-format";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import { useGrubpacAuth } from "@/lib/auth-context";
import {
    showErrorToast,
    showLeaseContractSubmittedToast,
} from "@/lib/toast/show-toast";
import type { AssetLine } from "./AssetLinesStep";
import type { LeaseTerms } from "./TermsStep";

interface ReviewStepProps {
    clientName: string;
    draftContractId: string;
    assetLines: AssetLine[];
    terms: LeaseTerms;
    onBack: () => void;
}

function formatBillingFrequency(
    value: LeaseTerms["billingFrequency"],
): string {
    const map = {
        monthly: "Monthly",
        quarterly: "Quarterly",
        annual: "Annually",
    } as const;
    return map[value] ?? value;
}

function reviewLineStatusLabel(line: LeaseContractReviewAssetLine): string {
    if (line.availability.shortfallConfirmed) {
        return "Awaiting assets";
    }
    if (line.availability.status === "covered") {
        return "Covered";
    }
    if (line.availability.status === "partial_today") {
        return "Partial";
    }
    if (line.availability.status === "shortfall") {
        return "Shortfall";
    }
    return line.availability.displayMessage ?? "—";
}

function reviewLineStatusClass(label: string): string {
    if (label === "Covered") {
        return "bg-green-50 text-green-700";
    }
    if (label === "Awaiting assets" || label === "Partial") {
        return "bg-orange-50 text-orange-800";
    }
    return "bg-slate-100 text-slate-600";
}

export default function ReviewStep({
    clientName,
    draftContractId,
    assetLines,
    terms,
    onBack,
}: ReviewStepProps) {
    const router = useRouter();
    const { token, organizationId } = useGrubpacAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reviewQuery = useQuery({
        queryKey: [
            "lease-contract-review",
            organizationId,
            draftContractId,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchLeaseContractReview(
                token,
                organizationId,
                draftContractId,
            );
        },
        enabled: Boolean(token && organizationId && draftContractId),
        staleTime: 0,
    });

    const canSubmitReview = reviewQuery.data?.canSubmit === true;

    const displayLines =
        reviewQuery.data?.assetLines ??
        assetLines.map((line) => ({
            assetClass: line.assetClass,
            committedQuantity: line.committedQuantity,
            ratePerVehicleMonth: line.ratePerVehicleMonth,
            availability: {
                status: "covered",
                availableNow: 0,
                inbound: 0,
                shortfallCount: 0,
                shortfallConfirmed: false,
            },
        }));

    const handleSubmitContract = async () => {
        setError(null);

        if (!token || !organizationId) {
            setError("Authentication or organization information is missing.");
            return;
        }

        if (!draftContractId) {
            setError("Draft contract is missing — go back and complete prior steps.");
            return;
        }

        if (!canSubmitReview) {
            setError("Complete all required steps before submitting.");
            return;
        }

        try {
            setIsSubmitting(true);

            const result = await confirmLeaseContract(
                token,
                organizationId,
                draftContractId,
            );
            const contractId = result.contract?.id ?? draftContractId;

            showLeaseContractSubmittedToast();
            router.push(
                `/fleet-leasing/lease-contracts/detail/?leaseId=${encodeURIComponent(contractId)}`,
            );
        } catch (err) {
            const message =
                err instanceof ApiClientError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : "Failed to submit lease contract.";
            setError(message);
            showErrorToast(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const primaryDisabled =
        isSubmitting ||
        reviewQuery.isLoading ||
        reviewQuery.isError ||
        !canSubmitReview;

    return (
        <>
            {reviewQuery.isLoading && (
                <p className="mb-3 text-xs text-slate-500" aria-busy="true">
                    Loading review from server…
                </p>
            )}

            {reviewQuery.data?.messages?.length ? (
                <ul className="mb-4 space-y-2">
                    {reviewQuery.data.messages.map((msg) => (
                        <li
                            key={`${msg.code ?? msg.level}-${msg.text}`}
                            className={`rounded-lg border px-3 py-2 text-xs ${
                                msg.level === "warning"
                                    ? "border-amber-200 bg-amber-50 text-amber-900"
                                    : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                        >
                            {msg.text}
                        </li>
                    ))}
                </ul>
            ) : null}

            {error && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                </div>
            )}

            <ReviewCard title="Contract">
                <div className="divide-y divide-slate-100">
                    <ReviewRow
                        label="Client"
                        value={
                            reviewQuery.data?.client?.companyName ?? clientName
                        }
                    />
                    <ReviewRow
                        label="Billing frequency"
                        value={formatBillingFrequency(terms.billingFrequency)}
                    />
                    <ReviewRow
                        label="Start date"
                        value={formatCalendarDateEnIn(terms.startDate)}
                    />
                    <ReviewRow
                        label="Term"
                        value={
                            terms.termMonths
                                ? `${terms.termMonths} months`
                                : undefined
                        }
                    />
                    <ReviewRow
                        label="Security deposit"
                        value={formatIndianRupee(Number(terms.securityDeposit))}
                    />
                </div>
            </ReviewCard>

            <ReviewCard title="Asset-class lines">
                <div className="overflow-hidden rounded-md border border-slate-200">
                    <div className="grid grid-cols-[1.4fr_0.5fr_0.9fr] gap-3 bg-slate-50 px-3 py-2 sm:px-4">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            Asset class
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            Qty
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            Status
                        </span>
                    </div>

                    {displayLines.map((line) => {
                        const statusLabel = reviewLineStatusLabel(line);
                        return (
                            <div
                                key={line.assetClass}
                                className="grid grid-cols-[1.4fr_0.5fr_0.9fr] items-center gap-3 border-t border-slate-100 px-3 py-3 sm:px-4"
                            >
                                <span className="text-xs font-medium text-slate-700">
                                    {line.assetClass}
                                </span>
                                <span className="text-xs text-slate-700">
                                    {line.committedQuantity}
                                </span>
                                <span
                                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold ${reviewLineStatusClass(statusLabel)}`}
                                >
                                    {statusLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </ReviewCard>

            <div className="mt-5 flex items-center justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Back
                </button>

                <Button
                    type="button"
                    variant="primary"
                    onClick={handleSubmitContract}
                    disabled={primaryDisabled}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting…
                        </>
                    ) : (
                        "Submit contract"
                    )}
                </Button>
            </div>

            <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-400">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                Submitting activates the contract (Active or Awaiting Assets per
                allocation). Non-standard rates activate on this path in MVP.
            </p>
        </>
    );
}

function ReviewCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-4 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {title}
                </h2>
            </div>
            <div className="px-4 py-3 sm:px-5">{children}</div>
        </section>
    );
}

function ReviewRow({
    label,
    value,
}: {
    label: string;
    value?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-1.5">
            <p className="shrink-0 text-[10px] text-slate-400">{label}</p>
            <p className="break-words text-right text-xs font-semibold text-slate-700">
                {value || "—"}
            </p>
        </div>
    );
}
