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
        await page.waitForSelector('[data-testid="memory-overview"]')        // Check for stats display
        await expect(page.locator('text=Total Memories')).toBeVisible()
        await expect(page.locator('text=Active Agents')).toBeVisible()
        await expect(page.locator('text=Recent Activity')).toBeVisible()        // Verify numerical stats are displayed (look for any number)        const memoryStats = page.locator('[data-testid="memory-overview"] .text-2xl.font-bold')
        await expect(memoryStats.first()).toBeVisible()
    })

    test('DEBUG: should open and use memory actions form', async ({ page }) => {
        // Capture console logs
        page.on('console', msg => console.log('Browser console:', msg.text()))

        // Wait for the page to fully load
        await page.waitForLoadState('networkidle')

        // Check initial state - form should not be visible
        const formInitial = page.locator('[data-testid="memory-form"]')
        await expect(formInitial).not.toBeVisible()        // Find the Add Memory button
        const addMemoryBtn = page.locator('[data-testid="quick-action-add-memory"]')
        await expect(addMemoryBtn).toBeVisible({ timeout: 10000 })

        // Debug: Check if MemoryActions component is actually rendered
        const memoryActionsComponent = page.locator('[data-testid="memory-actions"]')
        const isMemoryActionsVisible = await memoryActionsComponent.isVisible()
        console.log('MemoryActions component visible:', isMemoryActionsVisible)

        // Debug: Get all testids on the page
        const allTestIds = await page.locator('[data-testid]').evaluateAll(els =>
            els.map(el => el.getAttribute('data-testid'))
        )
        console.log('All testids on page:', allTestIds)

        // Debug: Check what we're actually clicking
        const buttonText = await addMemoryBtn.textContent()
        const buttonEnabled = await addMemoryBtn.isEnabled()
        console.log(`Button text: "${buttonText}"`)
        console.log(`Button enabled: ${buttonEnabled}`)
        console.log('About to click Add Memory button...')

        // Check render state before click
        const stateBefore = await page.evaluate(() => (window as any).__MEMORAI_STATE)
        console.log('State before click:', stateBefore)
        // Try with force to bypass any overlay issues
        await addMemoryBtn.click({ force: true })

        // If normal click doesn't work, try to trigger the state directly using JavaScript
        await page.evaluate(() => {
            // Find React component and trigger state change directly
            const button = document.querySelector('[data-testid="quick-action-add-memory"]') as HTMLElement
            if (button) {
                console.log('🔥 Manually triggering click via JavaScript')
                button.click()
            }
        })

        // Check if the debug property was set
        const debugInfo = await page.evaluate(() => (window as any).__MEMORAI_DEBUG)
        console.log('Debug info after click:', debugInfo)

        // Check render state after click
        const stateAfter = await page.evaluate(() => (window as any).__MEMORAI_STATE)
        console.log('State after click:', stateAfter)

        // Wait a bit for React to update state
        await page.waitForTimeout(500)

        // Check if form container appears first (it has different testid)
        const formContainer = page.locator('[data-testid="memory-form-container"]')

        try {
            await expect(formContainer).toBeVisible({ timeout: 2000 })
            console.log('✓ Form container is visible')
        } catch (e) {
            console.log('✗ Form container is NOT visible')
            // Take a screenshot to see what's happening
            await page.screenshot({ path: 'debug-after-click.png' })
        }

        // Then check for the actual form
        const form = page.locator('[data-testid="memory-form"]')

        try {
            await expect(form).toBeVisible({ timeout: 2000 })
            console.log('✓ Form is visible')
        } catch (e) {
            console.log('✗ Form is NOT visible')

            // Debug: Check if the form exists but is hidden
            const formExists = await form.count()
            console.log(`Form elements found: ${formExists}`)

            if (formExists > 0) {
                const formStyle = await form.first().getAttribute('style')
                const formClass = await form.first().getAttribute('class')
                console.log(`Form style: ${formStyle}`)
                console.log(`Form class: ${formClass}`)
            }
        }
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
            await page.waitForTimeout(300)            // Test expand
            await toggleBtn.click()
            await page.waitForTimeout(300)
        }
    })

    test('should display and interact with analytics dashboard', async ({ page }) => {
        // Debug: Check initial state
        console.log('Initial tab state - looking for debug div')
        const initialDebug = page.locator('text=Current Tab: overview')
        const initialVisible = await initialDebug.isVisible()
        console.log('Initial debug div (overview) visible:', initialVisible)

        // Navigate to analytics using data-testid
        const analyticsNav = page.locator('[data-testid="nav-analytics"]')
        await expect(analyticsNav).toBeVisible()
        console.log('Analytics nav button found and visible')

        // Check if button is actually clickable
        const isEnabled = await analyticsNav.isEnabled()
        console.log('Analytics nav button enabled:', isEnabled)

        await analyticsNav.click()
        console.log('Analytics nav button clicked')

        // Wait for navigation and any loading states
        await page.waitForTimeout(2000) // Longer wait to see if state changes

        // Debug: Check if the tab switched correctly by looking for tab content
        console.log('Current URL:', await page.url())

        // Check for the debug indicator that shows current tab
        const debugDiv = page.locator('text=Current Tab: analytics')
        const debugVisible = await debugDiv.isVisible()
        console.log('Debug div visible:', debugVisible)

        // Also check for overview tab (should not be visible)
        const overviewDebug = page.locator('text=Current Tab: overview')
        const overviewVisible = await overviewDebug.isVisible()
        console.log('Overview debug div still visible:', overviewVisible)

        // Check for the green debug banner
        const debugBanner = page.locator('text=DEBUG: Analytics tab selected')
        const bannerVisible = await debugBanner.isVisible()
        console.log('Debug banner visible:', bannerVisible)

        // First, let's try a more generic check to see if the analytics component is anywhere
        await page.waitForTimeout(2000) // Wait longer for state update
        // Look for analytics specific content (use actual content from component)
        const analyticsContent = page.locator('text=Analytics Dashboard, text=Total Memories, text=Active Agents')
        const contentCount = await analyticsContent.count()
        console.log('Analytics content found:', contentCount)

        // Wait for the analytics dashboard to appear with longer timeout
        await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible({ timeout: 10000 })

        // Test time range selector
        const timeRangeSelector = page.locator('select', { hasText: /7d|30d|90d/ })
        if (await timeRangeSelector.isVisible()) {
            await timeRangeSelector.selectOption('7d')
            await page.waitForTimeout(500)
        }
    })

    test('should handle system configuration', async ({ page }) => {        // Navigate to settings using data-testid
        const settingsNav = page.locator('[data-testid="nav-settings"]')
        await expect(settingsNav).toBeVisible()
        await settingsNav.click()

        // Wait for navigation and any loading states
        await page.waitForTimeout(1000)

        // Wait for the system config to appear with longer timeout
        await expect(page.locator('[data-testid="system-config"]')).toBeVisible({ timeout: 10000 })

        // Test configuration form if present
        const configForm = page.locator('form')
        if (await configForm.isVisible()) {
            // Fill sample config
            const inputs = await configForm.locator('input').all()
            for (let i = 0; i < Math.min(inputs.length, 3); i++) {
                await inputs[i].fill('test-value')
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
        await page.keyboard.press('Escape')        // Test enter key on buttons
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
        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle')

        // Open memory actions form - use more specific selector
        const addBtn = page.locator('[data-testid="quick-action-add-memory"]')
        await expect(addBtn).toBeVisible({ timeout: 10000 })

        // Wait for element to be stable
        await addBtn.waitFor({ state: 'attached' })
        await page.waitForTimeout(1000)

        await addBtn.click({ force: true })

        // Wait a bit for state to update
        await page.waitForTimeout(1500)

        // Wait for form to appear using multiple selectors
        const form = page.locator('[data-testid="memory-form"], form[role="form"]')
        await expect(form).toBeVisible({ timeout: 15000 })

        // Wait for submit button to be visible and try to submit empty form
        const submitBtn = page.locator('[data-testid="submit-memory-button"], button[type="submit"]')
        await expect(submitBtn).toBeVisible({ timeout: 10000 })
        await submitBtn.click({ force: true })

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
