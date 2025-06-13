import { test, expect } from '@playwright/test'

test.describe('Tailwind CSS Verification', () => {
    test('should verify Tailwind CSS is working correctly', async ({ page }) => {
        await page.goto('http://localhost:6366')

        // Wait for the page to load
        await page.waitForLoadState('networkidle')

        // Check if TailwindTest component exists
        const tailwindTest = await page.locator('.p-8.bg-blue-500').first()
        await expect(tailwindTest).toBeVisible()

        // Get computed styles to verify Tailwind is working
        const bgColor = await tailwindTest.evaluate(el => {
            return window.getComputedStyle(el).backgroundColor
        })

        const padding = await tailwindTest.evaluate(el => {
            return window.getComputedStyle(el).padding
        })

        console.log('Background color:', bgColor)
        console.log('Padding:', padding)

        // Check if styles are applied (blue-500 should have a blue background)
        expect(bgColor).toContain('rgb') // Should have actual color values, not just the class name
        expect(padding).not.toBe('0px') // Should have actual padding

        // Take a screenshot for visual verification
        await page.screenshot({ path: 'tailwind-test.png', fullPage: true })
    })
})
