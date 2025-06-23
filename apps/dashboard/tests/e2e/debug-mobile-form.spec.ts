import { test, expect } from "@playwright/test";

test.describe("Debug Mobile Form", () => {
  test("should debug mobile form visibility", async ({ page }) => {
    await page.goto("http://localhost:6366");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    console.log("=== DEBUGGING MOBILE FORM ===");

    // Navigate to overview tab
    await page.getByTestId("nav-overview").click();
    await page.waitForTimeout(1000);

    // Find the add memory button
    const addBtn = page.locator('[data-testid="quick-action-add-memory"]');
    await expect(addBtn).toBeVisible();

    console.log("Add button found and visible");

    // Click it
    await addBtn.click();
    await page.waitForTimeout(2000);

    // Check form container
    const formContainer = page.locator('[data-testid="memory-form-container"]');
    const containerVisible = await formContainer.isVisible();
    console.log("Form container visible:", containerVisible);

    if (containerVisible) {
      const containerStyles = await formContainer.getAttribute("class");
      console.log("Container classes:", containerStyles);

      const containerBounds = await formContainer.boundingBox();
      console.log("Container bounds:", containerBounds);
    }

    // Check form itself
    const form = page.locator('[data-testid="memory-form"]');
    const formVisible = await form.isVisible();
    console.log("Form visible:", formVisible);

    if ((await form.count()) > 0) {
      const formStyles = await form.getAttribute("class");
      console.log("Form classes:", formStyles);

      const formBounds = await form.boundingBox();
      console.log("Form bounds:", formBounds);

      // Check computed styles
      const computedStyles = await form.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          height: styles.height,
          overflow: styles.overflow,
          position: styles.position,
          zIndex: styles.zIndex,
          transform: styles.transform,
        };
      });
      console.log("Form computed styles:", computedStyles);
    }

    // Check parent container styles
    const parentContainer = page.locator('[data-testid="memory-actions"]');
    if ((await parentContainer.count()) > 0) {
      const parentStyles = await parentContainer.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          height: styles.height,
          maxHeight: styles.maxHeight,
          overflow: styles.overflow,
          position: styles.position,
          zIndex: styles.zIndex,
        };
      });
      console.log("Parent container computed styles:", parentStyles);
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: "debug-mobile-form.png", fullPage: true });

    // Force visibility for testing
    await form.evaluate((el) => {
      el.style.display = "block";
      el.style.visibility = "visible";
      el.style.opacity = "1";
      el.style.height = "auto";
      el.style.minHeight = "auto";
    });

    await page.waitForTimeout(1000);
    const formVisibleAfterForce = await form.isVisible();
    console.log("Form visible after force styling:", formVisibleAfterForce);

    // Check if it's actually visible now
    await expect(form).toBeVisible();
  });
});
