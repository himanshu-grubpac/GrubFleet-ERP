"use client";

import { useState } from "react";

import Button from "@/components/ui/GrubpacButton";

import {
    AlertCircle,
    Loader2,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
    createLeaseContract,
    type CreateLeaseContractInput,
} from "@/lib/api/lease-contracts";

import { useGrubpacAuth } from "@/lib/auth-context";

import type { AssetLine } from "./AssetLinesStep";
import type { LeaseTerms } from "./TermsStep";

interface ReviewStepProps {
    clientId: string;
    clientName: string;

    primaryPoc?: string;
    contact?: string;
    email?: string;

    assetLines: AssetLine[];
    terms: LeaseTerms;

    onBack: () => void;
}

const MOCK_AVAILABLE_ASSETS: Record<
    string,
    number
> = {
    Sedan: 14,
    SUV: 8,
    Pickup: 5,
    Van: 10,
    "Electric 2W": 18,
    "Electric 3W": 7,
    "Electric 4W": 6,
    Hatchback: 21,
    "Commercial Truck": 3,
};

export default function ReviewStep({
    clientId,
    clientName,
    primaryPoc,
    contact,
    email,
    assetLines,
    terms,
    onBack,
}: ReviewStepProps) {
    const router = useRouter();

    const { token, organizationId } =
        useGrubpacAuth();

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    // ============================================================
    // CREATE CONTRACT
    // ============================================================

    const handleCreateContract =
        async () => {
            setError(null);

            if (!token || !organizationId) {
                setError(
                    "Authentication or organization information is missing.",
                );
                return;
            }

            if (!clientId) {
                setError(
                    "Client information is missing.",
                );
                return;
            }

            if (!assetLines.length) {
                setError(
                    "At least one asset line is required.",
                );
                return;
            }

            try {
                setIsSubmitting(true);

                const payload = {
                    clientId,

                    startDate:
                        terms.startDate,

                    termMonths:
                        Number(
                            terms.termMonths,
                        ),

                    securityDeposit:
                        String(
                            terms.securityDeposit,
                        ),

                    billingFrequency:
                        terms.billingFrequency,

                    assetLines:
                        assetLines.map(
                            (line) => ({
                                assetClass:
                                    line.assetClass,

                                committedQuantity:
                                    Number(
                                        line.committedQuantity,
                                    ),

                                ratePerVehicleMonth:
                                    String(
                                        line.ratePerVehicleMonth,
                                    ),
                            }),
                        ),
                } as CreateLeaseContractInput;

                const data =
                    await createLeaseContract(
                        token,
                        organizationId,
                        payload,
                    );

                if (data?.id) {
                    router.push(
                        `/fleet-leasing/lease-contracts/${data.id}`,
                    );
                } else {
                    router.push(
                        "/fleet-leasing/lease-contracts",
                    );
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to create lease contract.",
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <>
                    <div className="mb-5">
                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                            Review contract
                        </h1>

                        <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                            Check the details below before
                            confirming.
                        </p>
                    </div>

                    {/* ERROR */}

                    {error && (
                        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

                            <span>
                                {error}
                            </span>
                        </div>
                    )}

                    {/* ==================================================
                        CLIENT
                    ================================================== */}

                    <ReviewCard title="Client">
                        <div className="divide-y divide-slate-100">
                            <ReviewRow
                                label="Company"
                                value={clientName}
                            />

                            <ReviewRow
                                label="Primary POC"
                                value={
                                    primaryPoc
                                }
                            />

                            <ReviewRow
                                label="Contact"
                                value={contact}
                            />

                            <ReviewRow
                                label="Email"
                                value={email}
                            />
                        </div>
                    </ReviewCard>

                    {/* ==================================================
                        ASSET CLASSES
                    ================================================== */}

                    <ReviewCard title="Asset Classes">
                        <div className="overflow-hidden rounded-md border border-slate-200">
                            {/* TABLE HEADER */}

                            <div className="grid grid-cols-[1.3fr_0.7fr_1.1fr_1.4fr] gap-3 bg-slate-50 px-3 py-2 sm:px-4">
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                    Asset class
                                </span>

                                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                    Committed
                                </span>

                                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                    Rate / vehicle / month
                                </span>

                                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                    Availability
                                </span>
                            </div>

                            {/* TABLE ROWS */}

                            {assetLines.map(
                                (line) => {
                                    const availableCount =
                                        MOCK_AVAILABLE_ASSETS[
                                        line.assetClass
                                        ] ?? 0;

                                    const committed =
                                        Number(
                                            line.committedQuantity,
                                        ) || 0;

                                    const shortage =
                                        Math.max(
                                            committed -
                                            availableCount,
                                            0,
                                        );

                                    const isCovered =
                                        availableCount >=
                                        committed;

                                    return (
                                        <div
                                            key={
                                                line.id
                                            }
                                            className="grid grid-cols-[1.3fr_0.7fr_1.1fr_1.4fr] items-center gap-3 border-t border-slate-100 px-3 py-3 sm:px-4"
                                        >
                                            {/* ASSET CLASS */}

                                            <span className="text-xs font-medium text-slate-700">
                                                {
                                                    line.assetClass
                                                }
                                            </span>

                                            {/* COMMITTED */}

                                            <span className="text-xs text-slate-700">
                                                {
                                                    committed
                                                }
                                            </span>

                                            {/* RATE */}

                                            <span className="text-xs text-slate-700">
                                                ₹
                                                {Number(
                                                    line.ratePerVehicleMonth,
                                                ).toLocaleString(
                                                    "en-IN",
                                                )}
                                            </span>

                                            {/* AVAILABILITY */}

                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold ${isCovered
                                                        ? "bg-green-50 text-green-700"
                                                        : "bg-red-50 text-red-600"
                                                        }`}
                                                >
                                                    {isCovered
                                                        ? "Covered"
                                                        : "Shortfall"}
                                                </span>

                                                <span className="text-[10px] text-slate-400">
                                                    {availableCount}{" "}
                                                    available
                                                    {shortage >
                                                        0
                                                        ? ` — ${shortage} more needed`
                                                        : " — fully covers committed"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </ReviewCard>

                    {/* ==================================================
                        TERMS
                    ================================================== */}

                    <ReviewCard title="Terms">
                        <div className="divide-y divide-slate-100">
                            <ReviewRow
                                label="Time period"
                                value={`${terms.termMonths} months`}
                            />

                            <ReviewRow
                                label="Security deposit"
                                value={`₹${Number(
                                    terms.securityDeposit,
                                ).toLocaleString(
                                    "en-IN",
                                )} — whole contract`}
                            />

                            <ReviewRow
                                label="Billing frequency"
                                value={
                                    terms.billingFrequency
                                        .charAt(
                                            0,
                                        )
                                        .toUpperCase() +
                                    terms.billingFrequency.slice(
                                        1,
                                    )
                                }
                            />
                        </div>
                    </ReviewCard>

                    {/* ==================================================
                        ACTIONS
                    ================================================== */}

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
                            onClick={handleCreateContract}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    Submit for approval

                                </>
                            )}
                        </Button>
                    </div>
        </>
    );
}

/* ================================================================
   REVIEW CARD
================================================================ */

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
                <h2 className="text-sm font-semibold text-slate-800">
                    {title}
                </h2>
            </div>

            <div className="px-4 py-3 sm:px-5">
                {children}
            </div>
        </section>
    );
}

/* ================================================================
   REVIEW ROW
================================================================ */

function ReviewRow({
    label,
    value,
}: {
    label: string;
    value?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-1.5">
            <p className="shrink-0 text-[10px] text-slate-400">
                {label}
            </p>

            <p className="break-words text-right text-xs font-semibold text-slate-700">
                {value || "—"}
            </p>
        </div>
    );
}