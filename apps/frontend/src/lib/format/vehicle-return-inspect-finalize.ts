import type {
    FleetReturnInspectionAttribution,
    FleetReturnInspectionFinalizeDraft,
    FleetReturnInspectionSectionCatalog,
    FleetReturnInspectionSummary,
    FleetReturnInspectionWorksheet,
} from "@/lib/api/fleet-leasing/returns";

const EXCESS_KM_RATE_MINOR = 400;
const MISSING_DEFAULT_MINOR = 2_500_00;

export type VehicleReturnInspectIssueRow = {
    sectionId: string;
    itemKey: string;
    label: string;
    rating: "minor" | "major";
    attribution?: FleetReturnInspectionAttribution;
    repairCostMinor?: number;
    chargeKey: string;
};

function defaultChargeForAttribution(
    attribution: FleetReturnInspectionAttribution | undefined,
): boolean {
    return attribution === "client_damage" || attribution === "missing";
}

export function collectVehicleReturnInspectIssues(
    catalog: FleetReturnInspectionSectionCatalog[],
    worksheet: FleetReturnInspectionWorksheet,
): VehicleReturnInspectIssueRow[] {
    const rows: VehicleReturnInspectIssueRow[] = [];
    for (const section of catalog) {
        const items = worksheet.sections[section.id] ?? {};
        for (const item of section.items) {
            const row = items[item.key];
            if (!row || row.rating === "pass" || row.rating === "unchecked") {
                continue;
            }
            if (row.rating !== "minor" && row.rating !== "major") continue;
            rows.push({
                sectionId: section.id,
                itemKey: item.key,
                label: item.label,
                rating: row.rating,
                attribution: row.attribution,
                repairCostMinor: row.repairCostMinor,
                chargeKey: `${section.id}:${item.key}`,
            });
        }
    }
    return rows;
}

export function computeClientRecoveryTotalMinor(
    issues: VehicleReturnInspectIssueRow[],
    summary: FleetReturnInspectionSummary,
    draft: Pick<
        FleetReturnInspectionFinalizeDraft,
        "issueCharges" | "waiveAllRecovery"
    >,
): number {
    if (draft.waiveAllRecovery) return 0;
    let total = 0;
    for (const issue of issues) {
        const charge =
            draft.issueCharges[issue.chargeKey] ??
            defaultChargeForAttribution(issue.attribution);
        if (!charge) continue;
        const cost = issue.repairCostMinor ?? 0;
        if (issue.attribution === "client_damage" && cost > 0) {
            total += cost;
        }
        if (issue.attribution === "missing") {
            total += cost > 0 ? cost : MISSING_DEFAULT_MINOR;
        }
    }
    if (summary.excessKm > 0) {
        total += summary.excessKm * EXCESS_KM_RATE_MINOR;
    }
    return total;
}

export function dispositionFooterSummary(
    disposition: FleetReturnInspectionFinalizeDraft["disposition"],
    recoveryTotalMinor: number,
): string {
    const recovery =
        recoveryTotalMinor > 0
            ? ` · ₹${(recoveryTotalMinor / 100).toLocaleString("en-IN")} to Finance`
            : "";
    if (disposition === "send_to_workshop") {
        return `Vehicle moves to Workshop${recovery}`;
    }
    if (disposition === "ready_to_lease") {
        return `Vehicle moves to Available pool${recovery}`;
    }
    if (disposition === "on_hold") {
        return `Vehicle stays on return hold${recovery}`;
    }
    if (disposition === "retire") {
        return `Vehicle marked retired${recovery}`;
    }
    return "Select a disposition to see where this vehicle goes next.";
}

export function defaultWorkshopTargetDateIso(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 4);
    return d.toISOString().slice(0, 10);
}
