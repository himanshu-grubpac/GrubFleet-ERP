"use client";



import { useState } from "react";



import Button from "@/components/ui/GrubpacButton";



import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";



import { useRouter } from "next/navigation";



import { confirmLeaseContract } from "@/lib/api/lease-contracts";



import { useGrubpacAuth } from "@/lib/auth-context";



import type { AssetLine } from "./AssetLinesStep";

import type { LeaseTerms } from "./TermsStep";



interface ReviewStepProps {

    clientName: string;

    draftContractId: string;

    assetLines: AssetLine[];

    terms: LeaseTerms;

    onBack: () => void;

}



function formatDisplayDate(isoDate: string): string {

    if (!isoDate) return "—";

    const parsed = new Date(`${isoDate}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return isoDate;

    return parsed.toLocaleDateString("en-IN", {

        day: "numeric",

        month: "short",

        year: "numeric",

    });

}



function formatBillingFrequency(value: LeaseTerms["billingFrequency"]): string {

    const map = {

        monthly: "Monthly",

        quarterly: "Quarterly",

        annual: "Annually",

    } as const;

    return map[value] ?? value;

}



function formatDeposit(value: string): string {

    const n = Number(value);

    if (!Number.isFinite(n)) return "—";

    return `Rs. ${n.toLocaleString("en-IN")}`;

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



        try {

            setIsSubmitting(true);



            const result = await confirmLeaseContract(

                token,

                organizationId,

                draftContractId,

            );



            const contractId = result.contract?.id ?? draftContractId;

            router.push(

                `/fleet-leasing/lease-contracts/detail/?leaseId=${encodeURIComponent(contractId)}`,

            );

        } catch (err) {

            setError(

                err instanceof Error

                    ? err.message

                    : "Failed to submit lease contract.",

            );

        } finally {

            setIsSubmitting(false);

        }

    };



    return (

        <>

            <div className="mb-5">

                <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">

                    {clientName || "Review contract"}

                </h1>



                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">

                    Final review before the contract goes live.

                </p>

            </div>



            {error && (

                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">

                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

                    <span>{error}</span>

                </div>

            )}



            <ReviewCard title="Contract">

                <div className="divide-y divide-slate-100">

                    <ReviewRow label="Client" value={clientName} />

                    <ReviewRow

                        label="Billing frequency"

                        value={formatBillingFrequency(terms.billingFrequency)}

                    />

                    <ReviewRow

                        label="Start date"

                        value={formatDisplayDate(terms.startDate)}

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

                        value={formatDeposit(String(terms.securityDeposit))}

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



                    {assetLines.map((line) => (

                        <div

                            key={line.id}

                            className="grid grid-cols-[1.4fr_0.5fr_0.9fr] items-center gap-3 border-t border-slate-100 px-3 py-3 sm:px-4"

                        >

                            <span className="text-xs font-medium text-slate-700">

                                {line.assetClass}

                            </span>

                            <span className="text-xs text-slate-700">

                                {line.committedQuantity}

                            </span>

                            <span className="inline-flex w-fit rounded-full bg-green-50 px-2.5 py-1 text-[9px] font-semibold text-green-700">

                                Allocated

                            </span>

                        </div>

                    ))}

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

                    disabled={isSubmitting}

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

                Submitting activates this contract immediately when rates and

                deposit are within standard limits (no approval step in this

                MVP).

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

