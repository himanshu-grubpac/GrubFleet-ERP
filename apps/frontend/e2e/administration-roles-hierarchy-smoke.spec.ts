import { expect, test } from "@playwright/test";

import { apiJson } from "./helpers/api";
import { loginViaUi, readAccessToken } from "./helpers/login";

test.describe("Administration roles hierarchy smoke", () => {
  test("login → list → create role with parent → Managed by on list", async ({
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

    const unique = Date.now();
    const parentName = `E2E Hierarchy Parent ${unique}`;
    const childName = `E2E Hierarchy Child ${unique}`;

    const parentRole = await apiJson<{ id: string; name: string }>(
      request,
      token,
      organizationId!,
      "POST",
      `/roles?organizationId=${organizationId}`,
      {
        organizationId,
        name: parentName,
        parentRoleId: null,
        moduleAccess: [{ moduleId: "dashboard", accessLevel: "VIEW" }],
      },
    );
    expect(parentRole.id).toBeTruthy();

    await page.goto("/administration/");
    await expect(
      page.getByRole("heading", { name: /roles & permissions/i }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("columnheader", { name: /managed by/i })).toBeVisible();

    await page.getByRole("button", { name: /\+ create role/i }).click();
    await expect(page.getByRole("heading", { name: /create role/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByPlaceholder("e.g. Fleet operator").fill(childName);

    const hierarchySelect = page
      .locator("label")
      .filter({ hasText: /organisation hierarchy/i })
      .locator("..")
      .locator("select");
    await expect(hierarchySelect).toBeVisible({ timeout: 30_000 });
    await hierarchySelect.selectOption({ label: parentName });

    await page
      .getByRole("checkbox", { name: /^read — dashboard$/i })
      .check();

    await page.getByRole("button", { name: /^create role$/i }).click();

    await expect(page.getByText(/created successfully/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: /roles & permissions/i })).toBeVisible({
      timeout: 30_000,
    });

    const childRow = page.getByRole("row", { name: new RegExp(childName) });
    await expect(childRow).toBeVisible({ timeout: 30_000 });
    await expect(childRow.getByText(parentName)).toBeVisible();
  });
});
