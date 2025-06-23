import { test, expect } from "@playwright/test";

test.describe("Debug Dashboard Elements", () => {
  test("should list all available testids on page load", async ({ page }) => {
    await page.goto("http://localhost:6366");

    // Wait for basic page structure
    await page.waitForSelector('[data-testid="dashboard-sidebar"]', {
      timeout: 10000,
    });

    // Get all elements with data-testid
    const testids = await page.$$eval("[data-testid]", (elements) =>
      elements.map((el) => el.getAttribute("data-testid")),
    );

    console.log("Available testids:", testids);

    // Check if total-memories is in the list
    console.log("total-memories found:", testids.includes("total-memories"));

    // Check current tab state
    const currentTab = await page.evaluate(() => {
      const tabs = document.querySelector('[role="tablist"]');
      const activeTab = tabs?.querySelector('[aria-selected="true"]');
      return activeTab?.getAttribute("data-value") || "unknown";
    });

    console.log("Current active tab:", currentTab);

    // Take a screenshot for manual inspection
    await page.screenshot({ path: "debug-dashboard.png", fullPage: true });

    expect(testids.length).toBeGreaterThan(0);
  });
});
