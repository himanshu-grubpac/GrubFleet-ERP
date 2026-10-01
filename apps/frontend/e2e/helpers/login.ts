import type { Page } from "@playwright/test";

export const e2eAdminEmail =
  process.env.E2E_ADMIN_EMAIL ?? "admin@grubpac.local";
export const e2eAdminPassword =
  process.env.E2E_ADMIN_PASSWORD ?? "Grubpac123";

/**
 * Login via UI. Uses form text inputs — @grubpac/ui-kit EmailInput/PasswordInput
 * render visible labels without htmlFor, so getByLabel is unreliable in e2e.
 */
export async function loginViaUi(page: Page): Promise<void> {
  await page.goto("/login");
  const form = page.locator("form");
  const fields = form.locator(
    'input:not([type="hidden"]):not([type="checkbox"])',
  );
  await fields.first().waitFor({ state: "visible", timeout: 60_000 });
  await fields.nth(0).fill(e2eAdminEmail);
  await fields.nth(1).fill(e2eAdminPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard**", { timeout: 60_000 });
}
