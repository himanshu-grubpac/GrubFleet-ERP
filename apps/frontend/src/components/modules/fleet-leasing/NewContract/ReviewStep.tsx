import { useMemo, useState } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Building2,
    Car,
    Calendar,
    FileText,
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
    assetLines: AssetLine[];
    terms: LeaseTerms;
    onBack: () => void;
}

export default function ReviewStep({
    clientId,
    clientName,
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

    const totalVehicles = useMemo(
        () =>
            assetLines.reduce(
                (sum, line) =>
                    sum +
                    Number(
                        line.committedQuantity,
                    ),
                0,
            ),
        [assetLines],
    );

    const monthlyBilling = useMemo(
        () =>
            assetLines.reduce(
                (sum, line) =>
                    sum +
                    Number(
                        line.committedQuantity,
                    ) *
                    Number(
                        line.ratePerVehicleMonth,
                    ),
                0,
            ),
        [assetLines],
    );

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

            try {
                setIsSubmitting(true);

                const payload: CreateLeaseContractInput =
                {
                    clientId,

                    startDate:
                        terms.startDate,

                    endDate:
                        terms.endDate,

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

                    amcTier:
                        terms.amcTier ||
                        undefined,

                    description:
                        terms.description ||
                        undefined,

                    additionalTerms:
                        terms.additionalTerms ||
                        undefined,

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
                };

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
        <div className="min-h-full bg-[#f5f5f5]">
            <Stepper currentStep={4} />

            <main className="mx-auto max-w-7xl px-6 py-3">
                <div className="max-w-[680px]">
                    <div className="mb-5">
                        <h1 className="text-[15px] font-semibold text-slate-900">
                            Review lease contract
                        </h1>

                        <p className="mt-1 text-[10px] text-slate-500">
                            Review the contract information
                            before creating the lease.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] text-red-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* CLIENT */}

                    <ReviewCard
                        icon={
                            <Building2 className="h-4 w-4 text-[#FE5720]" />
                        }
                        title="Client"
                    >
                        <Row
                            label="Client"
                            value={clientName}
                        />

                        <Row
                            label="Client ID"
                            value={clientId}
                        />
                    </ReviewCard>

                    {/* ASSET LINES */}

                    <ReviewCard
                        icon={
                            <Car className="h-4 w-4 text-[#FE5720]" />
                        }
                        title="Asset Lines"
                    >
                        <div className="overflow-hidden rounded-md border border-slate-200">
                            <div className="grid grid-cols-4 bg-slate-50 px-3 py-2">
                                <span className="text-[7px] font-semibold uppercase text-slate-400">
                                    Asset
                                </span>
                                <span className="text-[7px] font-semibold uppercase text-slate-400">
                                    Qty
                                </span>
                                <span className="text-[7px] font-semibold uppercase text-slate-400">
                                    Rate
                                </span>
                                <span className="text-right text-[7px] font-semibold uppercase text-slate-400">
                                    Monthly
                                </span>
                            </div>

                            {assetLines.map(
                                (line) => {
                                    const total =
                                        Number(
                                            line.committedQuantity,
                                        ) *
                                        Number(
                                            line.ratePerVehicleMonth,
                                        );

                                    return (
                                        <div
                                            key={
                                                line.id
                                            }
                                            className="grid grid-cols-4 border-t border-slate-100 px-3 py-2"
                                        >
                                            <span className="text-[9px] text-slate-700">
                                                {
                                                    line.assetClass
                                                }
                                            </span>

                                            <span className="text-[9px] text-slate-700">
                                                {
                                                    line.committedQuantity
                                                }
                                            </span>

                                            <span className="text-[9px] text-slate-700">
                                                ₹
                                                {Number(
                                                    line.ratePerVehicleMonth,
                                                ).toLocaleString(
                                                    "en-IN",
                                                )}
                                            </span>

                                            <span className="text-right text-[9px] font-semibold text-slate-700">
                                                ₹
                                                {total.toLocaleString(
                                                    "en-IN",
                                                )}
                                            </span>
                                        </div>
                                    );
                                },
                            )}
                        </div>

                        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3">
                            <span className="text-[9px] text-slate-500">
                                Total vehicles
                            </span>

                            <span className="text-[10px] font-semibold text-slate-800">
                                {totalVehicles}
                            </span>

                            <span className="text-[9px] text-slate-500">
                                Monthly billing
                            </span>

                            <span className="text-[10px] font-bold text-[#FE5720]">
                                ₹
                                {monthlyBilling.toLocaleString(
                                    "en-IN",
                                )}
                            </span>
                        </div>
                    </ReviewCard>

                    {/* TERMS */}

                    <ReviewCard
                        icon={
                            <Calendar className="h-4 w-4 text-[#FE5720]" />
                        }
                        title="Terms"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <Row
                                label="Start Date"
                                value={
                                    terms.startDate
                                }
                            />

                            <Row
                                label="End Date"
                                value={
                                    terms.endDate
                                }
                            />

                            <Row
                                label="Term"
                                value={`${terms.termMonths} months`}
                            />

                            <Row
                                label="Security Deposit"
                                value={`₹${Number(
                                    terms.securityDeposit,
                                ).toLocaleString(
                                    "en-IN",
                                )}`}
                            />

                            <Row
                                label="Billing"
                                value={
                                    terms.billingFrequency
                                }
                            />

                            <Row
                                label="AMC"
                                value={
                                    terms.amcTier
                                }
                            />
                        </div>
                    </ReviewCard>

                    {/* DESCRIPTION */}

                    {(terms.description ||
                        terms.additionalTerms) && (
                            <ReviewCard
                                icon={
                                    <FileText className="h-4 w-4 text-[#FE5720]" />
                                }
                                title="Additional Information"
                            >
                                {terms.description && (
                                    <Row
                                        label="Description"
                                        value={
                                            terms.description
                                        }
                                    />
                                )}

                                {terms.additionalTerms && (
                                    <div className="mt-3">
                                        <p className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                                            Additional Terms
                                        </p>

                                        <p className="mt-1 whitespace-pre-wrap text-[9px] leading-4 text-slate-700">
                                            {
                                                terms.additionalTerms
                                            }
                                        </p>
                                    </div>
                                )}
                            </ReviewCard>
                        )}

                    <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                            <p className="text-[10px] font-semibold text-emerald-800">
                                Everything looks ready.
                            </p>
                        </div>

                        <p className="mt-1 pl-6 text-[9px] text-emerald-700">
                            Creating the contract will send the
                            information above to the Lease Contract
                            API.
                        </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={isSubmitting}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleCreateContract
                            }
                            disabled={isSubmitting}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#FE5720] px-4 text-[10px] font-semibold text-white hover:bg-[#e94d1c] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    Create Lease Contract
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function ReviewCard({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-4 rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                {icon}
                <h2 className="text-[11px] font-semibold text-slate-800">
                    {title}
                </h2>
            </div>

            {children}
        </section>
    );
}

function Row({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-[7px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-[9px] text-slate-700">
                {value || "—"}
            </p>
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