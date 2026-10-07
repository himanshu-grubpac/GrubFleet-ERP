import { expect, test } from "@playwright/test";

import { loginViaUi } from "./helpers/login";

test.describe("Asset Register asset classes smoke", () => {
  test("login → asset class list loads", async ({ page }) => {
    await loginViaUi(page);
    await page.goto("/asset-register/assetclass");
    await expect(
      page.getByRole("heading", { name: /asset class/i }),
    ).toBeVisible({ timeout: 60_000 });
  });
});
