import { expect, test } from "@playwright/test";

import { apiJson } from "./helpers/api";
import { loginViaUi, readAccessToken } from "./helpers/login";

test.describe("Organisation locations smoke", () => {
  test("login → list → create (API) → view → deactivate", async ({
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

    await page.goto("/organization/locations");
    await expect(
      page.getByRole("heading", { name: /^locations$/i }),
    ).toBeVisible({ timeout: 60_000 });

    const types = await apiJson<{ items: Array<{ id: string; name: string }> }>(
      request,
      token,
      organizationId!,
      "GET",
      `/organisation/location-types?organizationId=${organizationId}`,
    );
    const officeTypeId =
      types.items.find((t) => t.name === "Office")?.id ?? types.items[0]?.id;
    expect(officeTypeId).toBeTruthy();

    const unique = Date.now();
    const locationName = `E2E Location ${unique}`;

    const created = await apiJson<{ id: string; name: string }>(
      request,
      token,
      organizationId!,
      "POST",
      `/organisation/locations?organizationId=${organizationId}`,
      {
        organizationId,
        name: locationName,
        locationTypeId: officeTypeId,
        addressLine1: "E2E Line 1",
        addressCountry: "IN",
        addressState: "Maharashtra",
        addressDistrict: "Mumbai",
        addressPincode: "400001",
        siteContactPhone: "+919876543210",
      },
    );
    expect(created.id).toBeTruthy();

    await page.goto("/organization/locations/create");
    await expect(
      page.getByRole("heading", { name: /add location/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel(/location name/i)).toBeVisible();

    await page.goto("/organization/locations");
    await expect(page.getByText(locationName)).toBeVisible({
      timeout: 60_000,
    });

    await page
      .getByRole("row", { name: new RegExp(locationName) })
      .getByRole("link", { name: /^view$/i })
      .click();

    await expect(page.getByRole("heading", { name: locationName })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText(/employee dropdowns for responsible person/i),
    ).toHaveCount(0);
    await expect(page.getByText(/site contact phone/i)).toBeVisible();

    await page.getByRole("button", { name: /^deactivate$/i }).click();
    const deactivateDialog = page.getByRole("dialog");
    await expect(deactivateDialog).toBeVisible();
    await deactivateDialog
      .getByLabel(/reason/i)
      .fill("E2E locations smoke deactivate");
    await deactivateDialog.getByRole("button", { name: /^deactivate$/i }).click();

    await expect(page.getByText(/deactivated/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
