import { expect, test } from "@playwright/test";

import { apiJson } from "./helpers/api";
import { loginViaUi, readAccessToken } from "./helpers/login";

test.describe("Fleet leasing lease contracts smoke", () => {
  test("login → list → draft via API → open new wizard", async ({
    page,
    request,
  }) => {
    await loginViaUi(page);
    const token = await readAccessToken(page);

    const me = await apiJson<{
      memberships: Array<{ organizationId: string }>;
    }>(request, token, undefined, "GET", "/auth/me");
    const organizationId = me.memberships[0]?.organizationId;
    expect(organizationId).toBeTruthy();

    const draft = await apiJson<{ id: string; contractNumber: string }>(
      request,
      token,
      organizationId!,
      "POST",
      `/fleet-leasing/lease-contracts?organizationId=${organizationId}`,
      { organizationId },
    );
    expect(draft.id).toBeTruthy();

    await page.goto("/fleet-leasing/lease-contracts");
    await expect(
      page.getByRole("heading", { name: /lease contracts/i }),
    ).toBeVisible({ timeout: 60_000 });

    await expect(page.getByText(draft.contractNumber)).toBeVisible({
      timeout: 60_000,
    });

    await page.goto("/fleet-leasing/lease-contracts/new");
    await expect(
      page.getByRole("heading", { name: /select client/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto(
      `/fleet-leasing/lease-contracts/detail/?leaseId=${encodeURIComponent(draft.id)}`,
    );
    await expect(page.getByText(draft.contractNumber)).toBeVisible({
      timeout: 60_000,
    });
  });
});
