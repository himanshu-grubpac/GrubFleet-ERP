import { useState } from "react";
import {
    Calendar,
    ArrowLeft,
    ArrowRight,
    AlertCircle,
    FileText,
} from "lucide-react";

const BILLING_FREQUENCIES = [
    "monthly",
    "quarterly",
    "annual",
] as const;

const AMC_TIERS = [
    "Gold",
    "Silver",
    "Bronze",
] as const;

export interface LeaseTerms {
    startDate: string;
    endDate: string;
    termMonths: number | "";
    securityDeposit: string;
    billingFrequency:
    | "monthly"
    | "quarterly"
    | "annual";
    amcTier: string;
    description: string;
    additionalTerms: string;
}

interface TermsStepProps {
    clientName: string;
    initialTerms?: LeaseTerms;
    onBack: () => void;
    onContinue: (terms: LeaseTerms) => void;
}

export default function TermsStep({
    clientName,
    initialTerms,
    onBack,
    onContinue,
}: TermsStepProps) {
    const [startDate, setStartDate] =
        useState(initialTerms?.startDate ?? "");

    const [endDate, setEndDate] =
        useState(initialTerms?.endDate ?? "");

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

    const [amcTier, setAmcTier] =
        useState(
            initialTerms?.amcTier ?? "Gold",
        );

    const [description, setDescription] =
        useState(
            initialTerms?.description ?? "",
        );

    const [additionalTerms, setAdditionalTerms] =
        useState(
            initialTerms?.additionalTerms ?? "",
        );

    const [formError, setFormError] =
        useState<string | null>(null);

    const calculateMonthsBetween = (
        start: string,
        end: string,
    ) => {
        const startDateValue =
            new Date(start);

        const endDateValue =
            new Date(end);

        const months =
            (endDateValue.getFullYear() -
                startDateValue.getFullYear()) *
            12 +
            (endDateValue.getMonth() -
                startDateValue.getMonth());

        return months > 0 ? months : 1;
    };

    const handleStartDateChange = (
        value: string,
    ) => {
        setStartDate(value);

        if (value && endDate) {
            setTermMonths(
                calculateMonthsBetween(
                    value,
                    endDate,
                ),
            );
        }
    };

    const handleEndDateChange = (
        value: string,
    ) => {
        setEndDate(value);

        if (startDate && value) {
            setTermMonths(
                calculateMonthsBetween(
                    startDate,
                    value,
                ),
            );
        }
    };

    const handleContinue = () => {
        setFormError(null);

        if (!startDate) {
            setFormError(
                "Please select a Start Date.",
            );
            return;
        }

        if (!endDate) {
            setFormError(
                "Please select an End Date.",
            );
            return;
        }

        if (
            new Date(endDate) <=
            new Date(startDate)
        ) {
            setFormError(
                "End Date must be after Start Date.",
            );
            return;
        }

        if (termMonths === "") {
            setFormError(
                "Please enter the Term in months.",
            );
            return;
        }

        if (
            Number(termMonths) < 1
        ) {
            setFormError(
                "Term must be at least 1 month.",
            );
            return;
        }

        if (securityDeposit === "") {
            setFormError(
                "Please enter the Security Deposit.",
            );
            return;
        }

        if (!billingFrequency) {
            setFormError(
                "Please select a Billing Frequency.",
            );
            return;
        }

        if (!amcTier) {
            setFormError(
                "Please select an AMC Tier.",
            );
            return;
        }

        onContinue({
            startDate,
            endDate,
            termMonths,
            securityDeposit,
            billingFrequency,
            amcTier,
            description,
            additionalTerms,
        });
    };

    return (
        <div className="min-h-full bg-[#f5f5f5]">
            <Stepper currentStep={3} />

            <main className="mx-auto max-w-7xl px-6 py-3">
                <div className="max-w-[680px]">
                    <div className="mb-5">
                        <h1 className="text-[15px] font-semibold text-slate-900">
                            Terms
                        </h1>

                        <p className="mt-1 text-[10px] text-slate-500">
                            Configure the lease duration,
                            billing, deposit, and AMC
                            terms.
                        </p>
                    </div>

                    <div className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                            Client
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-slate-800">
                            {clientName}
                        </p>
                    </div>

                    {formError && (
                        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] text-red-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{formError}</span>
                        </div>
                    )}

                    <div className="space-y-4 rounded-md border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Calendar className="h-4 w-4 text-[#FE5720]" />
                            <h2 className="text-[11px] font-semibold text-slate-800">
                                Schedule & Terms
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Start Date">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) =>
                                        handleStartDateChange(
                                            e.target.value,
                                        )
                                    }
                                    className="input"
                                />
                            </Field>

                            <Field label="End Date">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) =>
                                        handleEndDateChange(
                                            e.target.value,
                                        )
                                    }
                                    className="input"
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Term (Months)">
                                <input
                                    type="number"
                                    min="1"
                                    value={termMonths}
                                    onChange={(e) =>
                                        setTermMonths(
                                            e.target.value ===
                                                ""
                                                ? ""
                                                : Number(
                                                    e.target
                                                        .value,
                                                ),
                                        )
                                    }
                                    placeholder="e.g. 12"
                                    className="input"
                                />
                            </Field>

                            <Field label="Security Deposit (₹)">
                                <input
                                    type="number"
                                    min="0"
                                    value={
                                        securityDeposit
                                    }
                                    onChange={(e) =>
                                        setSecurityDeposit(
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. 100000"
                                    className="input"
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Billing Frequency">
                                <select
                                    value={
                                        billingFrequency
                                    }
                                    onChange={(e) =>
                                        setBillingFrequency(
                                            e.target
                                                .value as
                                            | "monthly"
                                            | "quarterly"
                                            | "annual",
                                        )
                                    }
                                    className="input"
                                >
                                    {BILLING_FREQUENCIES.map(
                                        (frequency) => (
                                            <option
                                                key={
                                                    frequency
                                                }
                                                value={
                                                    frequency
                                                }
                                            >
                                                {frequency
                                                    .charAt(
                                                        0,
                                                    )
                                                    .toUpperCase() +
                                                    frequency.slice(
                                                        1,
                                                    )}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </Field>

                            <Field label="AMC Tier">
                                <select
                                    value={amcTier}
                                    onChange={(e) =>
                                        setAmcTier(
                                            e.target.value,
                                        )
                                    }
                                    className="input"
                                >
                                    {AMC_TIERS.map(
                                        (tier) => (
                                            <option
                                                key={
                                                    tier
                                                }
                                                value={
                                                    tier
                                                }
                                            >
                                                {tier}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </Field>
                        </div>

                        <Field label="Description">
                            <input
                                type="text"
                                value={description}
                                onChange={(e) =>
                                    setDescription(
                                        e.target.value,
                                    )
                                }
                                placeholder="Enter lease contract description"
                                className="input"
                            />
                        </Field>

                        <div>
                            <div className="mb-1.5 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-[#FE5720]" />
                                <label className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                    Additional Terms & Clauses
                                </label>
                            </div>

                            <textarea
                                rows={4}
                                value={
                                    additionalTerms
                                }
                                onChange={(e) =>
                                    setAdditionalTerms(
                                        e.target.value,
                                    )
                                }
                                placeholder="Enter additional contractual terms..."
                                className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-[10px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                        </button>

                        <button
                            type="button"
                            onClick={handleContinue}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#FE5720] px-4 text-[10px] font-semibold text-white hover:bg-[#e94d1c]"
                        >
                            Continue
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-[8px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </label>
            {children}
        </div>
    );
}

function Stepper({
    currentStep,
}: {
    currentStep: number;
}) {
    const labels = [
        "Client",
        "Asset Lines",
        "Terms",
        "Review",
    ];

    return (
        <div className="border-b border-slate-200 bg-white px-6 py-3">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto flex max-w-[420px] items-start justify-between">
                    {labels.map((label, index) => {
                        const number = index + 1;
                        const completed =
                            number < currentStep;
                        const active =
                            number === currentStep;

                        return (
                            <div
                                key={label}
                                className="contents"
                            >
                                <Step
                                    number={number}
                                    label={label}
                                    active={active}
                                    completed={
                                        completed
                                    }
                                />

                                {index <
                                    labels.length -
                                    1 && (
                                        <div
                                            className={`mt-[10px] h-px flex-1 ${completed
                                                    ? "bg-[#2f6df6]"
                                                    : "bg-slate-200"
                                                }`}
                                        />
                                    )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Step({
    number,
    label,
    active,
    completed,
}: {
    number: number;
    label: string;
    active?: boolean;
    completed?: boolean;
}) {
    return (
        <div className="flex min-w-[55px] flex-col items-center">
            <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${active || completed
                        ? "bg-[#2f6df6] text-white"
                        : "border border-slate-300 bg-white text-slate-400"
                    }`}
            >
                {number}
            </div>

            <span
                className={`mt-1 text-[8px] ${active || completed
                        ? "font-semibold text-[#2f6df6]"
                        : "text-slate-400"
                    }`}
            >
                {label}
            </span>
        </div>
    );
}