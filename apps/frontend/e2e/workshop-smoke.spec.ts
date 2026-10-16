import { expect, test } from "@playwright/test";

import { loginViaUi } from "./helpers/login";

test.describe("Workshop smoke", () => {
  test("login → labour rate cards list", async ({ page }) => {
    await loginViaUi(page);
    await page.goto("/workshop/labour-rate-cards/");
    await expect(
      page.getByRole("heading", { name: /labou?r rate cards/i }),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("login → work orders list", async ({ page }) => {
    await loginViaUi(page);
    await page.goto("/workshop/work-order/");
    await expect(
      page.getByRole("heading", { name: /work orders/i }),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("login → log work order form", async ({ page }) => {
    await loginViaUi(page);
    await page.goto("/workshop/work-order/create/");
    await expect(
      page.getByRole("heading", { name: /log work order/i }),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("login → AMC dashboard and tier create entry", async ({ page }) => {
    await loginViaUi(page);
    await page.goto("/workshop/amc-maintenance/");
    await expect(
      page.getByRole("heading", { name: /AMC & Maintenance/i }),
    ).toBeVisible({ timeout: 60_000 });

    const createTier = page.getByRole("button", { name: /create tier/i });
    if (await createTier.isVisible()) {
      await createTier.click();
      await expect(
        page.getByRole("heading", { name: /create.*tier|AMC tier/i }),
      ).toBeVisible({ timeout: 60_000 });
    }
  });
});
