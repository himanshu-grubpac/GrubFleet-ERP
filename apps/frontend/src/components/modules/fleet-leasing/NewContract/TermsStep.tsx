"use client";

import { useState } from "react";
import Button from "@/components/ui/GrubpacButton";
import { AlertTriangle } from "lucide-react";

import type { AssetLine } from "./AssetLinesStep";

const BILLING_FREQUENCIES = [
    "monthly",
    "quarterly",
    "annual",
] as const;

export interface LeaseTerms {
    startDate: string;
    termMonths: number | "";
    securityDeposit: string;
    billingFrequency: "monthly" | "quarterly" | "annual";
}

interface TermsStepProps {
    clientName: string;
    assetLines: AssetLine[];
    initialTerms?: Partial<LeaseTerms>;
    onBack: () => void;
    onContinue: (
        terms: LeaseTerms,
        assetLines: AssetLine[],
    ) => void | Promise<void>;
}

export default function TermsStep({
    clientName,
    assetLines,
    initialTerms,
    onBack,
    onContinue,
}: TermsStepProps) {
    const [startDate, setStartDate] = useState(
        initialTerms?.startDate ?? "",
    );

    const [termMonths, setTermMonths] = useState<number | "">(
        initialTerms?.termMonths ?? "",
    );

    const [securityDeposit, setSecurityDeposit] = useState(
        initialTerms?.securityDeposit ?? "",
    );

    const [billingFrequency, setBillingFrequency] = useState<
        "monthly" | "quarterly" | "annual"
    >(initialTerms?.billingFrequency ?? "monthly");

    const [lineRates, setLineRates] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        for (const line of assetLines) {
            initial[line.id] = line.ratePerVehicleMonth ?? "";
        }
        return initial;
    });

    const [formError, setFormError] = useState<string | null>(null);
    const [isContinuing, setIsContinuing] = useState(false);

    const handleContinue = () => {
        setFormError(null);

        if (!startDate) {
            setFormError("Please select a start date.");
            return;
        }

        if (termMonths === "") {
            setFormError("Please enter the contract term in months.");
            return;
        }

        if (Number(termMonths) < 1) {
            setFormError("Term must be at least 1 month.");
            return;
        }

        if (securityDeposit === "") {
            setFormError("Please enter the security deposit.");
            return;
        }

        if (Number.isNaN(Number(securityDeposit)) || Number(securityDeposit) < 0) {
            setFormError("Security deposit must be a valid amount.");
            return;
        }

        const linesWithRates: AssetLine[] = [];
        for (const line of assetLines) {
            const rate = lineRates[line.id] ?? "";
            if (
                rate === "" ||
                Number.isNaN(Number(rate)) ||
                Number(rate) < 0
            ) {
                setFormError(
                    `Enter a valid monthly rate for ${line.assetClass}.`,
                );
                return;
            }
            linesWithRates.push({
                ...line,
                ratePerVehicleMonth: rate,
            });
        }

        setIsContinuing(true);
        void Promise.resolve(
            onContinue(
                {
                    startDate,
                    termMonths,
                    securityDeposit,
                    billingFrequency,
                },
                linesWithRates,
            ),
        ).finally(() => {
            setIsContinuing(false);
        });
    };

    return (
        <>
            <div className="mb-5">
                <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                    Contract terms
                </h1>
                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    Standard rate card only for this MVP — no exception pricing
                    path.
                </p>
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Client
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                    {clientName || "Selected client"}
                </p>
            </div>

            {formError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5 sm:py-5">
                    <div>
                        <label className="mb-1.5 block text-[10px] font-semibold text-slate-600">
                            Billing frequency
                        </label>
                        <select
                            value={billingFrequency}
                            onChange={(event) =>
                                setBillingFrequency(
                                    event.target
                                        .value as typeof billingFrequency,
                                )
                            }
                            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm capitalize text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                        >
                            {BILLING_FREQUENCIES.map((frequency) => (
                                <option key={frequency} value={frequency}>
                                    {frequency}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[10px] font-semibold text-slate-600">
                            Security deposit
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                ₹
                            </span>
                            <input
                                type="number"
                                min="0"
                                value={securityDeposit}
                                onChange={(event) =>
                                    setSecurityDeposit(event.target.value)
                                }
                                placeholder="e.g. 45000"
                                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[10px] font-semibold text-slate-600">
                            Term (months)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={termMonths}
                            onChange={(event) =>
                                setTermMonths(
                                    event.target.value === ""
                                        ? ""
                                        : Number(event.target.value),
                                )
                            }
                            placeholder="24"
                            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[10px] font-semibold text-slate-600">
                            Start date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) =>
                                setStartDate(event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                        />
                    </div>

                    {assetLines.map((line) => (
                        <div key={line.id} className="sm:col-span-2">
                            <label className="mb-1.5 block text-[10px] font-semibold text-slate-600">
                                Rate per {line.assetClass} / month
                            </label>
                            <div className="relative max-w-md">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={lineRates[line.id] ?? ""}
                                    onChange={(event) =>
                                        setLineRates((previous) => ({
                                            ...previous,
                                            [line.id]: event.target.value,
                                        }))
                                    }
                                    placeholder="e.g. 3200"
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

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
                    disabled={isContinuing}
                >
                    {isContinuing ? "Saving…" : "Continue"}
                </Button>
            </div>
        </>
    );
}
