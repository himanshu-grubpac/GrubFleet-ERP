import type { LeaseContractDetail } from "@/lib/api/lease-contracts";
import type { AssetLine } from "@/components/modules/fleet-leasing/NewContract/AssetLinesStep";
import type { LeaseTerms } from "@/components/modules/fleet-leasing/NewContract/TermsStep";

export type LeaseWizardScreen =
    | "select-client"
    | "register-client"
    | "asset-lines"
    | "terms"
    | "review";

/** Matches backend `addMonthsUtc` / ISO date-only storage. */
export function computeLeaseEndDateIso(
    startDate: string,
    termMonths: number | "",
): string {
    const trimmedStart = startDate.trim();
    if (
        !trimmedStart ||
        termMonths === "" ||
        Number(termMonths) < 1
    ) {
        return "";
    }

    const parts = trimmedStart.split("-").map((part) => Number(part));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
        return "";
    }

    const [year, month, day] = parts;
    const utc = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(utc.getTime())) {
        return "";
    }

    utc.setUTCMonth(utc.getUTCMonth() + Number(termMonths));
    return utc.toISOString().slice(0, 10);
}

export function termsAreComplete(terms: LeaseTerms): boolean {
    const endDate =
        terms.endDate.trim() ||
        computeLeaseEndDateIso(terms.startDate, terms.termMonths);

    return Boolean(
        terms.startDate.trim() &&
            endDate &&
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
    endDate?: string;
    termMonths?: number;
    securityDeposit?: string;
    billingFrequency?: LeaseTerms["billingFrequency"];
} {
    const patch: {
        startDate?: string;
        endDate?: string;
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

    const endDate =
        terms.endDate.trim() ||
        (patch.startDate && patch.termMonths
            ? computeLeaseEndDateIso(patch.startDate, patch.termMonths)
            : "");
    if (endDate) {
        patch.endDate = endDate;
    }

    if (String(terms.securityDeposit).trim()) {
        patch.securityDeposit = String(terms.securityDeposit).trim();
    }
    if (terms.billingFrequency) {
        patch.billingFrequency = terms.billingFrequency;
    }

    return patch;
}

export function buildCompleteTermsApiPayload(terms: LeaseTerms): {
    startDate: string;
    endDate: string;
    termMonths: number;
    securityDeposit: string;
    billingFrequency: LeaseTerms["billingFrequency"];
} | null {
    if (!termsAreComplete(terms)) {
        return null;
    }

    const startDate = terms.startDate.trim();
    const termMonths = Number(terms.termMonths);
    const endDate =
        terms.endDate.trim() ||
        computeLeaseEndDateIso(startDate, termMonths);

    if (!endDate) {
        return null;
    }

    return {
        startDate,
        endDate,
        termMonths,
        securityDeposit: String(terms.securityDeposit).trim(),
        billingFrequency: terms.billingFrequency,
    };
}
