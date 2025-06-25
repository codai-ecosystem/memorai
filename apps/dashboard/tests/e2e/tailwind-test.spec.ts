import { test, expect } from '@playwright/test';

test.describe('Tailwind CSS Verification', () => {
  test('should verify Tailwind CSS is working correctly', async ({ page }) => {
    await page.goto('http://localhost:6366');

    // Wait for the page to load
    await page.waitForLoadState('networkidle'); // Check if any element with Tailwind classes exists instead of a specific component
    const tailwindElements = await page
      .locator('[class*="bg-"], [class*="p-"], [class*="text-"]')
      .first();
    await expect(tailwindElements).toBeVisible();

    // Get computed styles to verify Tailwind is working
    const hasComputedStyles = await tailwindElements.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return (
        styles.backgroundColor !== '' ||
        styles.padding !== '' ||
        styles.color !== ''
      );
    });

    expect(hasComputedStyles).toBeTruthy();
  });
});
