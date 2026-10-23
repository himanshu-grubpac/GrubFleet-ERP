import { describe, expect, it } from "vitest";
import {
    LEASE_WIZARD_DRAFT_ASSET_LINE_RATE_PLACEHOLDER,
    mapWizardAssetLinesToApi,
} from "./lease-contract-wizard.util";

describe("mapWizardAssetLinesToApi", () => {
    it("uses draft placeholder when monthly rate is not entered yet", () => {
        const result = mapWizardAssetLinesToApi([
            {
                id: "line-1",
                assetClass: "sedan_a",
                committedQuantity: 1,
                ratePerVehicleMonth: "",
            },
        ]);

        expect(result).toEqual([
            {
                assetClass: "sedan_a",
                committedQuantity: 1,
                ratePerVehicleMonth:
                    LEASE_WIZARD_DRAFT_ASSET_LINE_RATE_PLACEHOLDER,
            },
        ]);
    });

    it("normalizes entered rates for API", () => {
        const result = mapWizardAssetLinesToApi([
            {
                id: "line-1",
                assetClass: "sedan_a",
                committedQuantity: 2,
                ratePerVehicleMonth: "34,500",
            },
        ]);

        expect(result[0].ratePerVehicleMonth).toBe("34500");
    });
});
