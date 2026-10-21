import type { LeaseContractDetail } from "@/lib/api/lease-contracts";
import type { AssetLine } from "@/components/modules/fleet-leasing/NewContract/AssetLinesStep";
import type { LeaseTerms } from "@/components/modules/fleet-leasing/NewContract/TermsStep";

export type LeaseWizardScreen =
    | "select-client"
    | "register-client"
    | "asset-lines"
    | "terms"
    | "review";

export function termsAreComplete(terms: LeaseTerms): boolean {
    return Boolean(
        terms.startDate.trim() &&
            terms.termMonths &&
            Number(terms.termMonths) >= 1 &&
            String(terms.securityDeposit).trim() &&
            terms.billingFrequency,
    );
}

export function termsCompleteFromDetail(
    detail: LeaseContractDetail,
): boolean {
    return Boolean(
        detail.startDate?.trim() &&
            detail.termMonths != null &&
            detail.termMonths >= 1 &&
            detail.securityDeposit != null &&
            detail.billingFrequency,
    );
}

export function assetLinesAreWizardReady(
    lines: Pick<AssetLine, "assetClass" | "committedQuantity">[],
): boolean {
    return (
        lines.length > 0 &&
        lines.every(
            (line) =>
                line.assetClass.trim().length > 0 &&
                line.committedQuantity >= 1,
        )
    );
}

export function assetLineRatesReady(lines: AssetLine[]): boolean {
    return (
        lines.length > 0 &&
        lines.every((line) => String(line.ratePerVehicleMonth ?? "").trim())
    );
}

export function mapDetailToWizardAssetLines(
    detail: LeaseContractDetail,
): AssetLine[] {
    return detail.assetLines.map((line) => ({
        id: line.id,
        assetClass: line.assetClass,
        committedQuantity: line.committedQuantity,
        ratePerVehicleMonth: String(line.ratePerVehicleMonth ?? ""),
    }));
}

/** Draft edit/new resume: infer first incomplete wizard step from API detail. */
export function inferDraftWizardResumeScreen(
    detail: LeaseContractDetail,
): LeaseWizardScreen {
    const clientId = detail.client?.id;
    if (!clientId) {
        return "select-client";
    }

    const lines = mapDetailToWizardAssetLines(detail);
    if (!assetLinesAreWizardReady(lines)) {
        return "asset-lines";
    }

    if (!termsCompleteFromDetail(detail)) {
        return "terms";
    }

    if (detail.rawStatus === "draft") {
        if (!assetLineRatesReady(lines)) {
            return "terms";
        }
        return "review";
    }

    return "asset-lines";
}

export function buildPartialTermsPatch(
    terms: LeaseTerms,
): {
    startDate?: string;
    termMonths?: number;
    securityDeposit?: string;
    billingFrequency?: LeaseTerms["billingFrequency"];
} {
    const patch: {
        startDate?: string;
        termMonths?: number;
        securityDeposit?: string;
        billingFrequency?: LeaseTerms["billingFrequency"];
    } = {};

    if (terms.startDate.trim()) {
        patch.startDate = terms.startDate.trim();
    }
    if (terms.termMonths !== "" && Number(terms.termMonths) >= 1) {
        patch.termMonths = Number(terms.termMonths);
    }
    if (String(terms.securityDeposit).trim()) {
        patch.securityDeposit = String(terms.securityDeposit).trim();
    }
    if (terms.billingFrequency) {
        patch.billingFrequency = terms.billingFrequency;
    }

    return patch;
}
