interface LeaseContractTermsProps {
    timePeriod: string;
    securityDeposit: string;
    billingFrequency: string;
}

export default function LeaseContractTerms({
    timePeriod,
    securityDeposit,
    billingFrequency,
}: LeaseContractTermsProps) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-4">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Terms
                </h2>

                <div className="mt-2 divide-y divide-slate-100">
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-500">
                            Time period
                        </span>

                        <span className="text-sm font-semibold text-slate-900">
                            {timePeriod}
                        </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-500">
                            Security deposit
                        </span>

                        <span className="text-sm font-semibold text-slate-900">
                            {securityDeposit}
                        </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-500">
                            Billing frequency
                        </span>

                        <span className="text-sm font-semibold text-slate-900">
                            {billingFrequency}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}