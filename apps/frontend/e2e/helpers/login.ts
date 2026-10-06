import { expect, type Page } from "@playwright/test";

const adminEmail =
  process.env.E2E_ADMIN_EMAIL ?? "admin@grubpac.local";
/** Prefer env; local bootstrap password (override if seed differs). */
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "Grubpac123";

export async function loginViaUi(page: Page): Promise<void> {
  await page.goto("/login");
  // ui-kit EmailInput/PasswordInput labels are not always htmlFor-associated.
  await page.getByPlaceholder("admin@grubpac.local").fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Login may land on /dashboard or hang briefly on the authenticated bootstrap
  // loader — wait for a token, then continue.
  await page.waitForFunction(
    () => Boolean(localStorage.getItem("access_token")),
    undefined,
    { timeout: 60_000 },
  );

  try {
    await page.waitForURL(/\/dashboard\/?/, { timeout: 15_000 });
  } catch {
    await page.goto("/dashboard");
  }

  await expect
    .poll(async () => page.url(), { timeout: 30_000 })
    .toMatch(/\/dashboard/);
}

export async function readAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() =>
    localStorage.getItem("access_token"),
  );
  if (!token) {
    throw new Error("access_token missing after login");
  }
  return token;
}
