import { expect, test } from "@playwright/test";

import { apiJson } from "./helpers/api";
import { loginViaUi } from "./helpers/login";

async function readAccessToken(
  page: import("@playwright/test").Page,
): Promise<string> {
  const token = await page.evaluate(() =>
    localStorage.getItem("access_token"),
  );
  if (!token) throw new Error("access_token missing after login");
  return token;
}

test.describe("Driver register smoke", () => {
  test("login, list, activate, deactivate, and inactive row has no edit", async ({
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
    const supplier = await apiJson<{ id: string }>(
      request,
      token,
      organizationId!,
      "POST",
      "/organisation/suppliers",
      {
        organizationId,
        name: `E2E Driver Staffing ${unique}`,
        supplierType: "driver",
        contactPerson: "E2E Contact",
        contactPhone: "+919876543210",
        contactEmail: `e2e.driver.supplier.${unique}@grubpac.local`,
        addressLine1: "E2E Line 1",
        addressCountry: "IN",
        addressState: "Maharashtra",
        addressDistrict: "Mumbai",
        addressPincode: "400001",
      },
    );

    const driverName = `E2E Driver ${unique}`;
    const driver = await apiJson<{ id: string; name: string }>(
      request,
      token,
      organizationId!,
      "POST",
      "/organisation/drivers",
      {
        organizationId,
        name: driverName,
        cprNo: String(unique).slice(-9).padStart(9, "0"),
        phone: "+919876543211",
        email: `e2e.driver.${unique}@grubpac.local`,
        licenseNumber: `DL-E2E-${unique}`,
        licenseExpiry: "2028-12-31",
        supplierId: supplier.id,
        addressLine1: "E2E Line 1",
        addressCountry: "IN",
        addressState: "Maharashtra",
        addressDistrict: "Mumbai",
        addressPincode: "400001",
      },
    );

    await page.goto("/organization/driver-register");
    await expect(
      page.getByRole("heading", { name: /driver register/i }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(driverName)).toBeVisible({ timeout: 60_000 });

    const row = page.getByRole("row", { name: new RegExp(driverName) });
    await row.getByRole("link", { name: /view driver/i }).click();
    await expect(page.getByRole("heading", { name: driverName })).toBeVisible({
      timeout: 30_000,
    });
    await page.goto("/organization/driver-register");

    await row.getByRole("button", { name: /driver actions/i }).click();
    await page.getByRole("menuitem", { name: /activate/i }).click();
    await page.getByRole("button", { name: /^activate$/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({
      timeout: 30_000,
    });

    await row.getByRole("button", { name: /driver actions/i }).click();
    await expect(page.getByRole("menuitem", { name: /^edit$/i })).toBeVisible();
    await page.keyboard.press("Escape");

    await row.getByRole("button", { name: /driver actions/i }).click();
    await page.getByRole("menuitem", { name: /deactivate/i }).click();
    await page.getByLabel(/reason/i).fill("E2E driver smoke deactivate");
    await page.getByRole("button", { name: /^deactivate$/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({
      timeout: 30_000,
    });

    await row.getByRole("button", { name: /driver actions/i }).click();
    await expect(
      page.getByRole("menuitem", { name: /^edit$/i }),
    ).not.toBeVisible();
    await expect(page.getByRole("menuitem", { name: /activate/i })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("combobox").selectOption({ label: "Inactive" });
    await expect(
      page.getByRole("cell", { name: driverName, exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto(`/organization/driver-register/${driver.id}/edit`);
    await expect(page.getByText(/redirecting|back to driver/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
