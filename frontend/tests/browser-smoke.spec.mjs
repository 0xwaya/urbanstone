import { test, expect } from '@playwright/test';

test('mobile launcher reopen flow and quote anchor behavior', async ({ page }) => {
  await page.goto('/');

  await page.waitForFunction(
    () => Boolean(document.querySelector('[aria-label="Open quick contact panel"]')),
    null,
    { timeout: 15_000 }
  );

  const launcher = page.getByRole('button', { name: /open quick contact panel/i });
  await expect(launcher).toBeVisible({ timeout: 15_000 });

  await launcher.click();
  await expect(page.getByText(/need a countertop estimate today\?/i)).toBeVisible();

  await page.getByRole('button', { name: /^dismiss$/i }).click();
  await expect(launcher).toBeVisible({ timeout: 15_000 });

  await launcher.click();
  await expect(page.getByText(/need a countertop estimate today\?/i)).toBeVisible();

  await page.getByRole('link', { name: /open form/i }).click();
  await expect(page).toHaveURL(/#quote$/);

  const quoteSection = page.locator('#quote');
  await expect(quoteSection).toBeVisible();
  await expect(quoteSection).toBeInViewport();
});
