"use client";

import { useState } from "react";
import Button from "@/components/ui/GrubpacButton";
import {
    AlertTriangle,

} from "lucide-react";

const BILLING_FREQUENCIES = [
    "monthly",
    "quarterly",
    "annual",
] as const;

export interface LeaseTerms {
    startDate: string;
    termMonths: number | "";
    securityDeposit: string;
    billingFrequency:
    | "monthly"
    | "quarterly"
    | "annual";
}

interface TermsStepProps {
    clientName: string;
    initialTerms?: Partial<LeaseTerms>;
    onBack: () => void;
    onContinue: (terms: LeaseTerms) => void;
}

export default function TermsStep({
    clientName,
    initialTerms,
    onBack,
    onContinue,
}: TermsStepProps) {
    const [startDate, setStartDate] = useState(
        initialTerms?.startDate ?? "",
    );

    const [termMonths, setTermMonths] =
        useState<number | "">(
            initialTerms?.termMonths ?? "",
        );

    const [securityDeposit, setSecurityDeposit] =
        useState(
            initialTerms?.securityDeposit ?? "",
        );

    const [billingFrequency, setBillingFrequency] =
        useState<
            "monthly" | "quarterly" | "annual"
        >(
            initialTerms?.billingFrequency ??
            "monthly",
        );

    const [formError, setFormError] =
        useState<string | null>(null);

    // ============================================================
    // CONTINUE
    // ============================================================

    const handleContinue = () => {
        setFormError(null);

        if (!startDate) {
            setFormError(
                "Please select a start date.",
            );
            return;
        }

        if (termMonths === "") {
            setFormError(
                "Please enter the time period.",
            );
            return;
        }

        if (Number(termMonths) < 1) {
            setFormError(
                "Time period must be at least 1 month.",
            );
            return;
        }

        if (securityDeposit === "") {
            setFormError(
                "Please enter the security deposit.",
            );
            return;
        }

        onContinue({
            startDate,
            termMonths,
            securityDeposit,
            billingFrequency,
        });
    };

    return (
        <>
                    <div className="mb-5">

                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                            Contract terms
                        </h1>

                        <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                            These apply to the whole contract.
                            Each asset-class line keeps its own
                            rate, set on the previous step.
                        </p>

                    </div>

                    {/* ==================================================
                        CLIENT
                    ================================================== */}

                    <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">

                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Client
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                            {clientName ||
                                "Selected client"}
                        </p>

                    </div>

                    {/* ==================================================
                        ERROR
                    ================================================== */}

                    {formError && (
                        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">

                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                            <span>
                                {formError}
                            </span>

                        </div>
                    )}

                    {/* ==================================================
                        CONTRACT TERMS
                    ================================================== */}

                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">

                        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5 sm:py-5">

                            {/* ==================================================
                                START DATE
                            ================================================== */}

                            <div>

                                <label className="mb-1.5 block text-[10px] font-semibold text-slate-600">
                                    Start date
                                </label>

                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(event) =>
                                        setStartDate(
                                            event.target.value,
                                        )
                                    }
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                />

                            </div>

                            {/* ==================================================
                                TIME PERIOD
                            ================================================== */}

                            <div>

                                <label className="mb-1.5 block text-[10px] font-semibold text-slate-600">
                                    Time period
                                </label>

                                <div className="relative">

                                    <input
                                        type="number"
                                        min="1"
                                        value={termMonths}
                                        onChange={(event) =>
                                            setTermMonths(
                                                event.target
                                                    .value ===
                                                    ""
                                                    ? ""
                                                    : Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                            )
                                        }
                                        placeholder="24 months"
                                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 pr-16 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                    />

                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                        months
                                    </span>

                                </div>

                            </div>

                            {/* ==================================================
                                SECURITY DEPOSIT
                            ================================================== */}

                            <div>

                                <label className="mb-1.5 block text-[10px] font-semibold text-slate-600">
                                    Security deposit
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={securityDeposit}
                                    onChange={(event) =>
                                        setSecurityDeposit(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. 96,000 — one figure for the whole contract"
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                />

                            </div>

                            {/* ==================================================
                                BILLING FREQUENCY
                            ================================================== */}

                            <div>

                                <label className="mb-1.5 block text-[10px] font-semibold text-slate-600">
                                    Billing frequency
                                </label>

                                <div className="flex flex-wrap gap-2">

                                    {BILLING_FREQUENCIES.map(
                                        (frequency) => {
                                            const isActive =
                                                billingFrequency ===
                                                frequency;

                                            return (
                                                <button
                                                    key={
                                                        frequency
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        setBillingFrequency(
                                                            frequency,
                                                        )
                                                    }
                                                    className={`h-10 rounded-md border px-4 text-sm font-semibold capitalize transition ${isActive
                                                        ? "border-[#FE5720] bg-orange-50 text-[#FE5720]"
                                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {
                                                        frequency
                                                    }
                                                </button>
                                            );
                                        },
                                    )}

                                </div>

                            </div>

                        </div>

                    </div>

                    {/* ==================================================
                        PRICING WARNING
                    ================================================== */}

                    <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">

                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FE5720]" />
                        <p className="leading-5">
                            Outside standard pricing limits. One or more
                            lines&apos; rate, or the deposit, falls below
                            the pricing engine&apos;s floor and doesn&apos;t
                            match a sanctioned discount — confirming will
                            raise a single approval request covering the
                            whole contract, to the Fleet/Leasing Manager,
                            instead of activating directly.
                        </p>

                    </div>

                    {/* ==================================================
                        ACTIONS
                    ================================================== */}

                    <div className="mt-5 flex items-center justify-between">

                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >


                            Back
                        </button>

                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleContinue}
                        >
                            Next: Review
                        </Button>

                    </div>
        </>
    );
}