"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { AlertTriangle } from "lucide-react";
import { FLEET_LEASE_TERMS_INPUT_LIMITS } from "@/lib/forms/restricted-input";

import type { AssetLine } from "./AssetLinesStep";

const BILLING_FREQUENCIES = [
    "monthly",
    "quarterly",
    "annual",
] as const;

const BILLING_FREQUENCY_LABELS: Record<
    (typeof BILLING_FREQUENCIES)[number],
    string
> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    annual: "Annually",
};

const FIELD_INPUT_CLASS =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

const MONEY_INPUT_CLASS =
    "h-10 w-full rounded-md border border-gray-300 bg-white pl-12 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

const FIELD_LABEL_CLASS =
    "mb-1.5 block text-sm font-medium text-gray-700";

export interface LeaseTerms {
    startDate: string;
    termMonths: number | "";
    securityDeposit: string;
    billingFrequency: "monthly" | "quarterly" | "annual";
}

interface TermsStepProps {
    assetLines: AssetLine[];
    initialTerms?: Partial<LeaseTerms>;
    onBack: () => void;
    onContinue: (
        terms: LeaseTerms,
        assetLines: AssetLine[],
    ) => void | Promise<void>;
}

function rateFieldLabel(assetClass: string): string {
    return `Rate per ${assetClass} — Standard / month`;
}

function MoneyField({
    id,
    label,
    value,
    onChange,
    placeholder,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <div>
            <label htmlFor={id} className={FIELD_LABEL_CLASS}>
                {label}
            </label>
            <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rs.
                </span>
                <RestrictedInput
                    id={id}
                    restrictedKind="digits"
                    maxLength={FLEET_LEASE_TERMS_INPUT_LIMITS.moneyMaxDigits}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={MONEY_INPUT_CLASS}
                />
            </div>
        </div>
    );
}

export default function TermsStep({
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

    const primaryLine = assetLines[0];
    const additionalLines = assetLines.slice(1);
    const fallbackAssetClass = "Petrol Scooter";

    const canSubmit = useMemo(() => {
        if (!startDate.trim()) {
            return false;
        }
        if (termMonths === "" || Number(termMonths) < 1) {
            return false;
        }
        if (
            securityDeposit === "" ||
            Number.isNaN(Number(securityDeposit)) ||
            Number(securityDeposit) < 0
        ) {
            return false;
        }
        if (!assetLines.length) {
            return false;
        }
        for (const line of assetLines) {
            const rate = lineRates[line.id] ?? "";
            if (
                rate === "" ||
                Number.isNaN(Number(rate)) ||
                Number(rate) < 0
            ) {
                return false;
            }
        }
        return true;
    }, [
        assetLines,
        lineRates,
        securityDeposit,
        startDate,
        termMonths,
    ]);

    const handleContinue = () => {
        setFormError(null);

        if (!canSubmit) {
            setFormError("Complete all required contract terms to continue.");
            return;
        }

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

    const renderRateField = (line: AssetLine) => (
        <MoneyField
            key={line.id}
            id={`lease-rate-${line.id}`}
            label={rateFieldLabel(line.assetClass || fallbackAssetClass)}
            value={lineRates[line.id] ?? ""}
            onChange={(value) =>
                setLineRates((previous) => ({
                    ...previous,
                    [line.id]: value,
                }))
            }
            placeholder="e.g. 3200"
        />
    );

    return (
        <>
            {formError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:px-5 sm:py-5 md:grid-cols-2">
                    <div>
                        <label
                            htmlFor="lease-billing-frequency"
                            className={FIELD_LABEL_CLASS}
                        >
                            Billing frequency
                        </label>
                        <select
                            id="lease-billing-frequency"
                            value={billingFrequency}
                            onChange={(event) =>
                                setBillingFrequency(
                                    event.target
                                        .value as typeof billingFrequency,
                                )
                            }
                            className={FIELD_INPUT_CLASS}
                        >
                            {BILLING_FREQUENCIES.map((frequency) => (
                                <option key={frequency} value={frequency}>
                                    {BILLING_FREQUENCY_LABELS[frequency]}
                                </option>
                            ))}
                        </select>
                    </div>

                    {primaryLine ? (
                        renderRateField(primaryLine)
                    ) : (
                        <div>
                            <p className={FIELD_LABEL_CLASS}>
                                {rateFieldLabel(fallbackAssetClass)}
                            </p>
                            <p className="text-sm text-gray-500">
                                Add asset-class lines on the previous step to
                                set rates.
                            </p>
                        </div>
                    )}

                    <MoneyField
                        id="lease-security-deposit"
                        label="Security deposit"
                        value={securityDeposit}
                        onChange={setSecurityDeposit}
                        placeholder="e.g. 45000"
                    />

                    <div>
                        <label
                            htmlFor="lease-term-months"
                            className={FIELD_LABEL_CLASS}
                        >
                            Term (months)
                        </label>
                        <RestrictedInput
                            id="lease-term-months"
                            restrictedKind="digits"
                            maxLength={
                                FLEET_LEASE_TERMS_INPUT_LIMITS.termMonthsMaxDigits
                            }
                            value={
                                termMonths === ""
                                    ? ""
                                    : String(termMonths)
                            }
                            onChange={(value) =>
                                setTermMonths(
                                    value === "" ? "" : Number(value),
                                )
                            }
                            placeholder="24"
                            className={FIELD_INPUT_CLASS}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="lease-start-date"
                            className={FIELD_LABEL_CLASS}
                        >
                            Start date
                        </label>
                        <input
                            id="lease-start-date"
                            type="date"
                            value={startDate}
                            onChange={(event) =>
                                setStartDate(event.target.value)
                            }
                            className={FIELD_INPUT_CLASS}
                            aria-describedby="lease-start-date-hint"
                        />
                        <p
                            id="lease-start-date-hint"
                            className="mt-1 text-xs text-gray-400"
                        >
                            DD-MM-YYYY
                        </p>
                    </div>

                    {additionalLines.map((line) => (
                        <div key={line.id} className="md:col-span-2">
                            <div className="md:grid md:grid-cols-2 md:gap-4">
                                <div className="hidden md:block" aria-hidden />
                                {renderRateField(line)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex h-10 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                    Back
                </button>

                <Button
                    type="button"
                    variant="primary"
                    onClick={handleContinue}
                    disabled={!canSubmit || isContinuing}
                >
                    {isContinuing ? "Saving…" : "Continue"}
                </Button>
            </div>
        </>
    );
}
