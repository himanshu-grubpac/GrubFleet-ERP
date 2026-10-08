import DetailField from "@/components/common/DetailField";
import OrganizationDetailCard, {
    OrganizationDetailFieldGrid,
} from "@/components/common/OrganizationDetailCard";

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
        <OrganizationDetailCard>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Terms
            </h2>
            <OrganizationDetailFieldGrid>
                <DetailField label="Time period" value={timePeriod} />
                <DetailField
                    label="Security deposit"
                    value={securityDeposit}
                />
                <DetailField
                    label="Billing frequency"
                    value={billingFrequency}
                />
            </OrganizationDetailFieldGrid>
        </OrganizationDetailCard>
    );
}
