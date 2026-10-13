import { expect, test } from "@playwright/test";

import { loginViaUi } from "./helpers/login";

test.describe("Fleet leasing support — vehicle replacement smoke", () => {
    test("login → Support landing → vehicle replacement step 1", async ({
        page,
    }) => {
        await loginViaUi(page);

        await page.goto("/fleet-leasing/support/");
        await expect(
            page.getByRole("heading", { name: /^Support$/i }),
        ).toBeVisible({ timeout: 60_000 });

        await expect(page.getByText("Vehicle replacement")).toBeVisible();

        await page.getByRole("link", { name: /vehicle replacement/i }).click();

        await expect(
            page.getByRole("heading", {
                name: /select vehicles to replace/i,
            }),
        ).toBeVisible({ timeout: 30_000 });

        await expect(page.getByText("Select vehicles")).toBeVisible();
        await expect(page.getByText("Choose replacements")).toBeVisible();
        await expect(
            page.getByRole("tab", { name: /registration or vin/i }),
        ).toBeVisible();
        await expect(
            page.getByText("No vehicles selected yet"),
        ).toBeVisible();
    });
});
