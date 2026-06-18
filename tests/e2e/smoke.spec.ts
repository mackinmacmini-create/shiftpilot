import { test, expect } from "@playwright/test";

/**
 * Smoke test: an unauthenticated visitor sees the marketing/landing route,
 * the login route renders, and protected routes redirect to /login.
 *
 * Run prerequisites:
 *   - `npm run e2e:install` once to install the Chromium binary.
 *   - `npm run dev` running, or let Playwright spawn it via the webServer config.
 */

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
});

test("forgot-password page renders", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
});

test("protected route redirects unauthenticated visitor to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
