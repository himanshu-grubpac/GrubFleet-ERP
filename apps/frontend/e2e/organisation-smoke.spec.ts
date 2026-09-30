import { expect, test, type APIRequestContext } from "@playwright/test";

const adminEmail =
  process.env.E2E_ADMIN_EMAIL ?? "admin@grubpac.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "Grubpac123";
const apiBase =
  process.env.E2E_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000/api/v1";

async function loginViaUi(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard**", { timeout: 60_000 });
}

async function readAccessToken(
  page: import("@playwright/test").Page,
): Promise<string> {
  const token = await page.evaluate(() =>
    localStorage.getItem("access_token"),
  );
  if (!token) throw new Error("access_token missing after login");
  return token;
}

async function apiJson<T>(
  request: APIRequestContext,
  token: string,
  organizationId: string | undefined,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${apiBase.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (organizationId) {
    headers["x-organization-id"] = organizationId;
  }
  const res = await request.fetch(url, {
    method,
    headers,
    data: body,
  });
  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed ${res.status()}: ${text}`);
  }
  return (await res.json()) as T;
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

    const reasonField = page.getByLabel(/reason/i);
    await reasonField.fill("E2E smoke deactivate");
    await page.getByRole("button", { name: /^deactivate$/i }).click();

    await expect(page.getByText(/deactivated|inactive/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
