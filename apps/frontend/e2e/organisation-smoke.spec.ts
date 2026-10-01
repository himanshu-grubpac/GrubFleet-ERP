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

test.describe("Organisation smoke", () => {
  test("login, lists, and employee deactivate via UI", async ({ page, request }) => {
    await loginViaUi(page);
    const token = await readAccessToken(page);

    const me = await apiJson<{
      memberships: Array<{ organizationId: string }>;
    }>(request, token, undefined, "GET", "/auth/me");
    const organizationId = me.memberships[0]?.organizationId;
    expect(organizationId).toBeTruthy();

    await page.goto("/organization/locations");
    await expect(page.getByRole("heading", { name: /locations/i })).toBeVisible({
      timeout: 60_000,
    });

    await page.goto("/organization/employees");
    await expect(page.getByRole("heading", { name: /employees/i })).toBeVisible({
      timeout: 60_000,
    });

    await page.goto("/organization/suppliers");
    await expect(page.getByRole("heading", { name: /suppliers/i })).toBeVisible({
      timeout: 60_000,
    });

    const supplierUnique = Date.now();
    const supplier = await apiJson<{ id: string; name: string }>(
      request,
      token,
      organizationId!,
      "POST",
      "/organisation/suppliers",
      {
        organizationId,
        name: `E2E Supplier ${supplierUnique}`,
        supplierType: "spare_parts",
        contactPerson: "E2E Contact",
        contactPhone: "+919876543210",
        contactEmail: `e2e.supplier.${supplierUnique}@grubpac.local`,
        addressLine1: "E2E Line 1",
        addressCountry: "IN",
        addressState: "Maharashtra",
        addressDistrict: "Mumbai",
        addressPincode: "400001",
      },
    );

    await page.goto("/organization/suppliers");
    await expect(page.getByText(supplier.name)).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("button", { name: /^spare parts$/i }).click();
    await expect(page.getByText(supplier.name)).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: /^all$/i }).click();

    const supplierTypes = await apiJson<{
      items: Array<{ key: string; label: string }>;
    }>(
      request,
      token,
      organizationId!,
      "GET",
      `/organisation/suppliers/types?organizationId=${organizationId}`,
    );
    expect(supplierTypes.items.some((t) => t.key === "spare_parts")).toBe(true);

    const supplierRow = page.getByRole("row", {
      name: new RegExp(supplier.name),
    });
    await supplierRow.getByRole("link", { name: /view supplier/i }).click();
    await expect(page.getByRole("heading", { name: supplier.name })).toBeVisible({
      timeout: 30_000,
    });
    await page.goto("/organization/suppliers");

    const searchInput = page.getByPlaceholder(
      /search by supplier or contact person name/i,
    );
    await searchInput.fill(String(supplierUnique));
    await expect(page.getByText(supplier.name)).toBeVisible({
      timeout: 30_000,
    });
    await searchInput.fill("");

    await supplierRow
      .getByRole("button", { name: /supplier actions/i })
      .click();
    await page.getByRole("menuitem", { name: /deactivate/i }).click();
    await page.getByLabel(/reason/i).fill("E2E supplier smoke deactivate");
    await page.getByRole("button", { name: /^deactivate$/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("combobox").selectOption({ label: "Inactive" });
    await expect(
      page.getByRole("cell", { name: supplier.name, exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });

    const inactiveSeedName = "Dev Seed Supplier — NorthStar Fleet Parts (US)";
    const inactiveSeedRow = page.getByRole("row", {
      name: new RegExp(inactiveSeedName),
    });
    if (await inactiveSeedRow.isVisible().catch(() => false)) {
      await inactiveSeedRow
        .getByRole("button", { name: /supplier actions/i })
        .click();
      await page.getByRole("menuitem", { name: /activate/i }).click();
      await page.getByRole("button", { name: /^activate$/i }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible({
        timeout: 30_000,
      });
    }
    await page.getByRole("combobox").selectOption({ label: "All statuses" });

    const clientUnique = Date.now();
    const client = await apiJson<{ id: string; clientName: string }>(
      request,
      token,
      organizationId!,
      "POST",
      "/organisation/clients",
      {
        organizationId,
        clientName: `E2E Client ${clientUnique}`,
        addressLine1: "E2E Line 1",
        addressCountry: "IN",
        addressState: "Maharashtra",
        addressDistrict: "Mumbai",
        addressPincode: "400001",
        pointsOfContact: [
          {
            name: "E2E POC",
            contactNumber: "+919876543211",
            email: `e2e.client.${clientUnique}@grubpac.local`,
            isPrimary: true,
          },
        ],
      },
    );

    await page.goto("/organization/clients");
    await expect(page.getByRole("heading", { name: /^clients$/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(client.clientName)).toBeVisible({
      timeout: 60_000,
    });

    const clientRow = page.getByRole("row", {
      name: new RegExp(client.clientName),
    });
    await clientRow.getByRole("link", { name: /view client/i }).click();
    await expect(
      page.getByRole("heading", { name: client.clientName }),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto("/organization/clients");
    await clientRow
      .getByRole("button", { name: /client actions/i })
      .click();
    await page.getByRole("menuitem", { name: /deactivate/i }).click();
    await page.getByLabel(/reason/i).fill("E2E client smoke deactivate");
    await page.getByRole("button", { name: /^deactivate$/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({
      timeout: 30_000,
    });

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
    const location = await apiJson<{ id: string }>(
      request,
      token,
      organizationId!,
      "POST",
      `/organisation/locations?organizationId=${organizationId}`,
      {
        organizationId,
        name: `E2E Location ${unique}`,
        locationTypeId: officeTypeId,
        addressLine1: "E2E Line 1",
        addressCountry: "IN",
        addressState: "Maharashtra",
        addressDistrict: "Mumbai",
        addressPincode: "400001",
      },
    );

    const employee = await apiJson<{ id: string; fullName: string }>(
      request,
      token,
      organizationId!,
      "POST",
      `/organisation/employees?organizationId=${organizationId}`,
      {
        organizationId,
        fullName: `E2E Employee ${unique}`,
        designation: "Analyst",
        department: "Operations",
        locationId: location.id,
        employmentType: "full_time",
        dateOfJoining: "2024-06-01",
        phone: "+919876543210",
        email: `e2e.employee.${unique}@grubpac.local`,
      },
    );

    await page.goto("/organization/employees");
    await expect(page.getByText(employee.fullName)).toBeVisible({
      timeout: 60_000,
    });

    const row = page.getByRole("row", { name: new RegExp(employee.fullName) });
    await row
      .getByRole("button", { name: /employee actions/i })
      .click();
    await page.getByRole("menuitem", { name: /deactivate/i }).click();
    await page.getByRole("button", { name: /^resignation$/i }).click();
    await page.locator("#employee-deactivate-comment").fill(
      "E2E smoke deactivate",
    );
    await page.getByRole("button", { name: /^deactivate$/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({
      timeout: 30_000,
    });

    const employeeDetail = await apiJson<{ status: string }>(
      request,
      token,
      organizationId!,
      "GET",
      `/organisation/employees/${employee.id}?organizationId=${organizationId}`,
    );
    expect(employeeDetail.status).toBe("inactive");
  });
});
