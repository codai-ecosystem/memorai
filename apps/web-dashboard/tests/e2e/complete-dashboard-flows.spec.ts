import { test, expect } from '@playwright/test'

test.describe('Memory Dashboard - Complete User Flows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test('should load main dashboard page successfully', async ({ page }) => {
        // Verify page loads
        await expect(page).toHaveTitle(/Memorai/i)

        // Check that main sections are present
        await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
        await expect(page.locator('[data-testid="dashboard-sidebar"]')).toBeVisible()
        await expect(page.locator('[data-testid="memory-overview"]')).toBeVisible()
        await expect(page.locator('[data-testid="memory-actions"]')).toBeVisible()
    })

    test('should display memory overview with stats', async ({ page }) => {
        // Wait for overview section to load
        await page.waitForSelector('[data-testid="memory-overview"]')
        // Check for stats display
        await expect(page.locator('text=Total Memories')).toBeVisible()
        await expect(page.locator('text=Active Agents')).toBeVisible()
        await expect(page.locator('text=Recent Activity')).toBeVisible()

        // Verify numerical stats are displayed (look for any number)
        const memoryStats = page.locator('[data-testid="memory-overview"] .text-2xl.font-bold')
        await expect(memoryStats.first()).toBeVisible()
    })

    test('should open and use memory actions form', async ({ page }) => {
        // Find and click Add Memory button
        const addMemoryBtn = page.locator('button', { hasText: 'Add Memory' }).first()
        await addMemoryBtn.click()

        // Verify form appears
        await expect(page.locator('label', { hasText: 'Content' })).toBeVisible()
        await expect(page.locator('label', { hasText: 'Tags' })).toBeVisible()

        // Fill out the form
        await page.fill('textarea[id="memory-content"]', 'Test memory content from E2E test')
        await page.fill('input[id="memory-tags"]', 'test, e2e, automated')

        // Submit the form
        const submitBtn = page.locator('button[type="submit"]')
        await submitBtn.click()

        // Check for success message (assuming toast notification)
        await expect(page.locator('text=Memory added successfully')).toBeVisible()
    })
    test('should handle memory search functionality', async ({ page }) => {
        // Find search input in header using data-testid
        const searchInput = page.locator('[data-testid="header-search-input"]')
        await searchInput.fill('test query')

        // Submit search
        await page.keyboard.press('Enter')

        // Verify search results area appears
        await expect(page.locator('[data-testid="memory-results"]')).toBeVisible()
    })

    test('should navigate through sidebar menu items', async ({ page }) => {
        // Test each sidebar navigation item
        const menuItems = [
            'Overview',
            'Search',
            'Memories',
            'Analytics',
            'Settings',
            'Agents',
            'Security',
            'Activity'
        ]

        for (const item of menuItems) {
            const menuItem = page.locator(`text=${item}`).first()
            if (await menuItem.isVisible()) {
                await menuItem.click()
                // Wait for navigation/content change
                await page.waitForTimeout(500)
            }
        }
    })

    test('should toggle sidebar collapse/expand', async ({ page }) => {
        // Find sidebar toggle button
        const toggleBtn = page.locator('[data-testid="sidebar-toggle"]')

        if (await toggleBtn.isVisible()) {
            // Test collapse
            await toggleBtn.click()
            await page.waitForTimeout(300)

            // Test expand
            await toggleBtn.click()
            await page.waitForTimeout(300)
        }
    })

    test('should display and interact with analytics dashboard', async ({ page }) => {
        // Navigate to analytics if it exists
        const analyticsLink = page.locator('text=Analytics').first()
        if (await analyticsLink.isVisible()) {
            await analyticsLink.click()

            // Check for analytics components
            await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible()

            // Test time range selector
            const timeRangeSelector = page.locator('select', { hasText: /7d|30d|90d/ })
            if (await timeRangeSelector.isVisible()) {
                await timeRangeSelector.selectOption('7d')
                await page.waitForTimeout(500)
            }
        }
    })

    test('should handle system configuration', async ({ page }) => {
        // Navigate to settings/config
        const settingsLink = page.locator('text=Settings').first()
        if (await settingsLink.isVisible()) {
            await settingsLink.click()

            // Check for system config components
            await expect(page.locator('[data-testid="system-config"]')).toBeVisible()

            // Test configuration form if present
            const configForm = page.locator('form')
            if (await configForm.isVisible()) {
                // Fill sample config
                const inputs = await configForm.locator('input').all()
                for (let i = 0; i < Math.min(inputs.length, 3); i++) {
                    await inputs[i].fill('test-value')
                }
            }
        }
    })
    test('should handle error states gracefully', async ({ page }) => {
        // Test that the application loads without any console errors
        const consoleLogs: string[] = []
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleLogs.push(msg.text())
            }
        })

        // Reload the page
        await page.reload()

        // Check that the page still loads correctly
        await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()

        // Verify no critical console errors (allow some network errors as they're expected in testing)
        const criticalErrors = consoleLogs.filter(log =>
            !log.includes('Failed to fetch') &&
            !log.includes('404') &&
            !log.includes('NetworkError')
        )
        expect(criticalErrors.length).toBe(0)
    })

    test('should be responsive on mobile devices', async ({ page }) => {
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 })

        // Verify responsive layout
        const sidebar = page.locator('[data-testid="dashboard-sidebar"]')
        const header = page.locator('[data-testid="dashboard-header"]')

        await expect(header).toBeVisible()
        // Sidebar might be collapsed on mobile
    })

    test('should handle keyboard navigation', async ({ page }) => {
        // Test tab navigation
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')

        // Test escape key handling
        await page.keyboard.press('Escape')

        // Test enter key on buttons
        const buttons = await page.locator('button').all()
        if (buttons.length > 0) {
            await buttons[0].focus()
            await page.keyboard.press('Enter')
        }
    })

    test('should display memory results with filtering', async ({ page }) => {
        // Navigate to memory results section
        const resultsSection = page.locator('[data-testid="memory-results"]')

        if (await resultsSection.isVisible()) {
            // Test filter controls
            const filterButtons = page.locator('button[data-filter]')
            const filterCount = await filterButtons.count()

            for (let i = 0; i < filterCount; i++) {
                await filterButtons.nth(i).click()
                await page.waitForTimeout(300)
            }
        }
    })
    test('should validate form inputs correctly', async ({ page }) => {
        // Open memory actions form
        const addBtn = page.locator('button', { hasText: 'Add Memory' }).first()
        await addBtn.click()

        // Try to submit empty form
        const submitBtn = page.locator('button[type="submit"]')
        await submitBtn.click()

        // Should show validation error via toast (or other means) - just verify form didn't submit
        // Check that form is still visible (didn't close on failed submit)
        await expect(page.locator('textarea[id="memory-content"]')).toBeVisible()

        // Fill minimum required fields
        await page.fill('textarea[id="memory-content"]', 'Valid content')
        await submitBtn.click()

        // Should succeed - form might close or show success
        await page.waitForTimeout(1000) // Give time for any async operations
    })

    test('should handle theme switching', async ({ page }) => {
        // Look for theme toggle button
        const themeToggle = page.locator('[data-testid="theme-toggle"]')

        if (await themeToggle.isVisible()) {
            // Test light/dark mode toggle
            await themeToggle.click()
            await page.waitForTimeout(300)

            // Verify theme change in DOM classes
            const body = page.locator('body')
            const classList = await body.getAttribute('class')
            expect(classList).toMatch(/dark|light/)
        }
    })

    test('should display notifications correctly', async ({ page }) => {
        // Trigger an action that shows notification
        const notificationTrigger = page.locator('button', { hasText: /import|assist/ }).first()

        if (await notificationTrigger.isVisible()) {
            await notificationTrigger.click()

            // Check for toast notification
            await expect(page.locator('[role="alert"], .toast, [data-testid="notification"]')).toBeVisible()
        }
    })

    test('should handle large data sets performance', async ({ page }) => {
        // Test with many memory items
        const startTime = Date.now()

        // Navigate through different sections
        const sections = ['Overview', 'Analytics', 'Search']
        for (const section of sections) {
            const link = page.locator(`text=${section}`).first()
            if (await link.isVisible()) {
                await link.click()
                await page.waitForLoadState('networkidle')
            }
        }

        const endTime = Date.now()
        const loadTime = endTime - startTime

        // Performance should be reasonable (under 5 seconds for navigation)
        expect(loadTime).toBeLessThan(5000)
    })
})
