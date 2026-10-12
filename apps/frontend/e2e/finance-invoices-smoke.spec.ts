import { expect, test } from "@playwright/test";

import { apiJson } from "./helpers/api";
import { loginViaUi, readAccessToken } from "./helpers/login";

test.describe("Finance invoices smoke", () => {
  test("login → invoices list → purchase create (vehicle tab + summary)", async ({
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

    await page.goto("/finance/invoices");
    await expect(
      page.getByRole("heading", { name: /^invoices$/i }),
    ).toBeVisible({ timeout: 60_000 });

    const list = await apiJson<{ items: unknown[] }>(
      request,
      token,
      organizationId!,
      "GET",
      `/finance/invoices?organizationId=${organizationId}&page=1&pageSize=20`,
    );
    expect(Array.isArray(list.items)).toBe(true);

    await page.goto("/finance/invoices/new/purchase");
    await expect(
      page.getByRole("heading", { name: /add purchase invoice/i }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByRole("button", { name: /^vehicle$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /spare parts/i }),
    ).toBeVisible();

    await expect(page.getByText(/invoice summary/i)).toBeVisible();
    await expect(page.getByText(/invoice date \*/i).first()).toBeVisible();
  });
});
