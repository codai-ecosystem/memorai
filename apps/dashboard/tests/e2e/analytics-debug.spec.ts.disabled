import { test, expect } from '@playwright/test'

test.describe('Analytics Debug Test', () => {
    test('should debug analytics rendering issue', async ({ page }) => {
        await page.goto('http://localhost:6366')

        // Wait for the page to load
        await page.waitForLoadState('networkidle')

        console.log('=== INITIAL STATE ===')
        const initialContent = await page.textContent('body')
        console.log('Page contains "Overview":', initialContent?.includes('Overview'))
        console.log('Page contains "Analytics":', initialContent?.includes('Analytics'))

        // Click analytics nav
        console.log('=== CLICKING ANALYTICS ===')
        const analyticsNav = page.locator('[data-testid="nav-analytics"]')
        await analyticsNav.click()
        await page.waitForTimeout(3000)

        console.log('=== AFTER ANALYTICS CLICK ===')
        const afterContent = await page.textContent('body')
        console.log('Page contains "Analytics Dashboard":', afterContent?.includes('Analytics Dashboard'))
        console.log('Page contains "Current Tab: analytics":', afterContent?.includes('Current Tab: analytics'))
        console.log('Page contains debug banner:', afterContent?.includes('DEBUG: Analytics tab selected'))

        // Check what's actually rendered in the main content area
        const mainContent = await page.locator('main').textContent()
        console.log('Main content length:', mainContent?.length)
        console.log('Main content snippet:', mainContent?.substring(0, 200))

        // Check specifically for analytics component
        const analyticsComponent = page.locator('[data-testid="analytics-dashboard"]')
        const isVisible = await analyticsComponent.isVisible()
        console.log('Analytics component visible:', isVisible)

        if (isVisible) {
            const componentContent = await analyticsComponent.textContent()
            console.log('Analytics component content:', componentContent?.substring(0, 200))
        }

        // Take a screenshot for visual inspection
        await page.screenshot({ path: 'analytics-debug.png', fullPage: true })

        // Check browser console for errors
        const consoleMessages = []
        page.on('console', msg => consoleMessages.push(msg.text()))

        // Wait a bit longer and check again
        await page.waitForTimeout(2000)
        console.log('Console messages:', consoleMessages)
    })
})
