"use client";

import { useMemo, useState } from "react";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { FLEET_LEASE_TERMS_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import {
    formatLeaseDecimalMoneyForInput,
    validateLeaseDecimalMoneyInput,
} from "@/lib/format/money-format";
import {
    validateDate,
    validateNumber,
    validateRequired,
} from "@/components/common/Commonvalidation";
import FormActions from "@/components/common/FormActions";
import { computeLeaseEndDateIso } from "@/lib/lease-contract/lease-contract-wizard.util";
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
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5728]/20";

const MONEY_INPUT_CLASS =
    "h-10 w-full rounded-md border border-gray-300 bg-white pl-12 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

const FIELD_LABEL_CLASS =
    "mb-1.5 block text-sm font-medium text-gray-700";

const FIELD_ERROR_CLASS = "mt-1 text-xs text-red-600";

const READONLY_DATE_CLASS =
    "h-10 w-full cursor-default rounded-md border border-gray-200 bg-slate-50 px-3 text-sm text-gray-700 outline-none";

export interface LeaseTerms {
    startDate: string;
    endDate: string;
    termMonths: number | "";
    securityDeposit: string;
    billingFrequency: "monthly" | "quarterly" | "annual";
}

export interface TermsDraftSnapshot {
    terms: LeaseTerms;
    assetLinesWithRates: AssetLine[];
}

interface TermsStepProps {
    assetLines: AssetLine[];
    initialTerms?: Partial<LeaseTerms>;
    onBack: () => void;
    onContinue: (
        terms: LeaseTerms,
        assetLines: AssetLine[],
    ) => void | Promise<void>;
    onSaveDraft?: (snapshot: TermsDraftSnapshot) => void | Promise<void>;
    isSaveDraftPending?: boolean;
    showSaveDraft?: boolean;
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
    error,
    showError,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    error?: string;
    showError: boolean;
}) {
    const errorId = `${id}-error`;

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
                    restrictedKind="inrRupee"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={MONEY_INPUT_CLASS}
                    aria-invalid={showError && Boolean(error)}
                    aria-describedby={
                        showError && error ? errorId : undefined
                    }
                />
            </div>

            {showError && error && (
                <p id={errorId} className={FIELD_ERROR_CLASS} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

export default function TermsStep({
    assetLines,
    initialTerms,
    onBack,
    onContinue,
    onSaveDraft,
    isSaveDraftPending = false,
    showSaveDraft = false,
}: TermsStepProps) {
    const [startDate, setStartDate] = useState(
        initialTerms?.startDate ?? "",
    );

    const [termMonths, setTermMonths] = useState<number | "">(
        initialTerms?.termMonths ?? "",
    );

    const [securityDeposit, setSecurityDeposit] = useState(() =>
        formatLeaseDecimalMoneyForInput(initialTerms?.securityDeposit ?? ""),
    );

    const [billingFrequency, setBillingFrequency] = useState<
        "monthly" | "quarterly" | "annual"
    >(initialTerms?.billingFrequency ?? "monthly");

    const [lineRates, setLineRates] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};

        for (const line of assetLines) {
            initial[line.id] = formatLeaseDecimalMoneyForInput(
                line.ratePerVehicleMonth ?? "",
            );
        }

        return initial;
    });

    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [isContinuing, setIsContinuing] = useState(false);

    const fallbackAssetClass = "Petrol Scooter";

    const computedEndDate = useMemo(
        () => computeLeaseEndDateIso(startDate, termMonths),
        [startDate, termMonths],
    );

    const fieldErrors = useMemo(() => {
        const errors: Record<string, string | undefined> = {};

        errors.startDate =
            validateRequired(startDate, "Start date") ??
            (startDate
                ? validateDate(startDate, { label: "Start date" })
                : undefined);

        errors.termMonths = validateNumber(termMonths, {
            label: "Contract term",
            min: 1,
            integer: true,
        });

        errors.securityDeposit = validateLeaseDecimalMoneyInput(
            securityDeposit,
            {
                label: "Security deposit",
                min: 0,
            },
        );

        for (const line of assetLines) {
            errors[`rate-${line.id}`] = validateLeaseDecimalMoneyInput(
                lineRates[line.id] ?? "",
                {
                    label: `Monthly rate for ${line.assetClass || "the asset class"}`,
                    min: 0,
                },
            );
        }

        return errors;
    }, [assetLines, lineRates, securityDeposit, startDate, termMonths]);

    const validationSummary = useMemo(() => {
        const errors = Object.values(fieldErrors).filter(
            (message): message is string => Boolean(message),
        );

        if (assetLines.length === 0) {
            errors.unshift("Add at least one asset-class line.");
        }

        return errors;
    }, [assetLines.length, fieldErrors]);

    const canSubmit = validationSummary.length === 0;

    const buildTermsSnapshot = (): TermsDraftSnapshot => ({
        terms: {
            startDate,
            endDate: computedEndDate,
            termMonths,
            securityDeposit,
            billingFrequency,
        },
        assetLinesWithRates: assetLines.map((line) => ({
            ...line,
            ratePerVehicleMonth: lineRates[line.id] ?? "",
        })),
    });

    const handleContinue = async () => {
        setHasAttemptedSubmit(true);

        if (!canSubmit || isContinuing) {
            return;
        }

        const { terms: snapshotTerms, assetLinesWithRates } =
            buildTermsSnapshot();

        setIsContinuing(true);

        try {
            await onContinue(snapshotTerms, assetLinesWithRates);
        } finally {
            setIsContinuing(false);
        }
    };

    const handleSaveDraft = () => {
        if (!onSaveDraft || isSaveDraftPending || isContinuing) {
            return;
        }

        void onSaveDraft(buildTermsSnapshot());
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
            error={fieldErrors[`rate-${line.id}`]}
            showError={hasAttemptedSubmit}
        />
    );

    return (
        <>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                        event.target.value as typeof billingFrequency,
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

                        <MoneyField
                            id="lease-security-deposit"
                            label="Security deposit"
                            value={securityDeposit}
                            onChange={setSecurityDeposit}
                            placeholder="e.g. 45000"
                            error={fieldErrors.securityDeposit}
                            showError={hasAttemptedSubmit}
                        />
                    </div>

                    {assetLines.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {assetLines.map((line) => renderRateField(line))}
                        </div>
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                                aria-invalid={
                                    hasAttemptedSubmit &&
                                    Boolean(fieldErrors.startDate)
                                }
                                aria-describedby={
                                    hasAttemptedSubmit &&
                                    fieldErrors.startDate
                                        ? "lease-start-date-error"
                                        : "lease-start-date-hint"
                                }
                            />

                            {hasAttemptedSubmit && fieldErrors.startDate && (
                                <p
                                    id="lease-start-date-error"
                                    className={FIELD_ERROR_CLASS}
                                    role="alert"
                                >
                                    {fieldErrors.startDate}
                                </p>
                            )}

                            <p
                                id="lease-start-date-hint"
                                className="mt-1 text-xs text-gray-400"
                            >
                                DD-MM-YYYY
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="lease-end-date"
                                className={FIELD_LABEL_CLASS}
                            >
                                End date
                            </label>

                            <input
                                id="lease-end-date"
                                type="date"
                                value={computedEndDate}
                                readOnly
                                tabIndex={-1}
                                className={READONLY_DATE_CLASS}
                                aria-describedby="lease-end-date-hint"
                            />

                            <p
                                id="lease-end-date-hint"
                                className="mt-1 text-xs text-gray-400"
                            >
                                From start date + term
                            </p>
                        </div>

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
                                aria-invalid={
                                    hasAttemptedSubmit &&
                                    Boolean(fieldErrors.termMonths)
                                }
                                aria-describedby={
                                    hasAttemptedSubmit &&
                                    fieldErrors.termMonths
                                        ? "lease-term-months-error"
                                        : undefined
                                }
                            />

                            {hasAttemptedSubmit && fieldErrors.termMonths && (
                                <p
                                    id="lease-term-months-error"
                                    className={FIELD_ERROR_CLASS}
                                    role="alert"
                                >
                                    {fieldErrors.termMonths}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-5">
                <FormActions
                    hasAttemptedSubmit={hasAttemptedSubmit}
                    validationSummary={validationSummary}
                    isSaving={isContinuing}
                    canSubmit={canSubmit && !isContinuing}
                    onCancel={onBack}
                    onSave={handleContinue}
                    saveLabel="Continue"
                    savingLabel="Saving..."
                    cancelLabel="Back"
                    secondaryAction={
                        showSaveDraft && onSaveDraft
                            ? {
                                  label: "Save draft",
                                  onClick: handleSaveDraft,
                                  disabled: isSaveDraftPending,
                                  isPending: isSaveDraftPending,
                                  pendingLabel: "Saving...",
                              }
                            : undefined
                    }
                />
            </div>
        </>
    );
}
