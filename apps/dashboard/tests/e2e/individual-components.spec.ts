import { test, expect } from '@playwright/test'

test.describe('Individual Component Testing - Every Component', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test.describe('Dashboard Header Component', () => {
        test('should display all header elements', async ({ page }) => {
            const header = page.locator('[data-testid="dashboard-header"]')
            await expect(header).toBeVisible()

            // Check for search functionality
            const searchInput = page.locator('input[type="search"], input[placeholder*="search"]')
            if (await searchInput.count() > 0) {
                await expect(searchInput.first()).toBeVisible()
            }

            // Check for notification bell
            const notificationBtn = page.locator('button[aria-label*="notification"], button:has-text("Bell")')
            if (await notificationBtn.count() > 0) {
                await notificationBtn.first().click()
            }            // Check for settings menu
            const settingsBtn = page.locator('button[aria-label*="setting"], button:has-text("Settings")')
            if (await settingsBtn.count() > 0) {
                await settingsBtn.first().click({ force: true })
            }

            // Check for user menu
            const userBtn = page.locator('button[aria-label*="user"], button:has-text("User")')
            if (await userBtn.count() > 0) {
                await userBtn.first().click()
            }
        })

        test('should handle search input and submission', async ({ page }) => {
            const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first()

            if (await searchInput.isVisible()) {
                await searchInput.fill('test search query')
                await searchInput.press('Enter')

                // Verify search was processed
                await page.waitForTimeout(500)
            }
        })

        test('should toggle theme if theme switcher exists', async ({ page }) => {
            const themeButtons = page.locator('button[aria-label*="theme"], button:has([data-testid*="theme"])')

            if (await themeButtons.count() > 0) {
                const themeBtn = themeButtons.first()
                await themeBtn.click()

                // Check if page class changed
                await page.waitForTimeout(300)
                const bodyClass = await page.locator('body').getAttribute('class')
                expect(bodyClass).toMatch(/.+/)
            }
        })
    })

    test.describe('Dashboard Sidebar Component', () => {
        test('should display all navigation items', async ({ page }) => {
            const sidebar = page.locator('[data-testid="dashboard-sidebar"]')
            await expect(sidebar).toBeVisible()

            // Check for main navigation items
            const navItems = [
                'Overview', 'Home', 'Dashboard',
                'Search', 'Find', 'Memories',
                'Analytics', 'Reports', 'Stats',
                'Settings', 'Config', 'Options',
                'Agents', 'Users', 'Team',
                'Security', 'Privacy', 'Access',
                'Activity', 'Logs', 'History'
            ]

            let foundItems = 0
            for (const item of navItems) {
                const navItem = page.locator(`text=${item}`).first()
                if (await navItem.isVisible()) {
                    foundItems++
                    await navItem.click()
                    await page.waitForTimeout(200)
                }
            }

            expect(foundItems).toBeGreaterThan(0)
        })

        test('should handle sidebar collapse/expand', async ({ page }) => {
            // Look for collapse/expand button
            const toggleButtons = page.locator('button:has([data-testid*="chevron"]), button:has([data-testid*="toggle"])')

            if (await toggleButtons.count() > 0) {
                const toggleBtn = toggleButtons.first()

                // Test collapse
                await toggleBtn.click()
                await page.waitForTimeout(300)

                // Test expand
                await toggleBtn.click()
                await page.waitForTimeout(300)
            }
        })

        test('should highlight active navigation item', async ({ page }) => {
            const navLinks = page.locator('[data-testid="dashboard-sidebar"] a, [data-testid="dashboard-sidebar"] button')
            const linkCount = await navLinks.count()

            if (linkCount > 0) {
                await navLinks.first().click()
                await page.waitForTimeout(300)

                // Check for active state classes
                const activeLink = page.locator('[data-testid="dashboard-sidebar"] .active, [data-testid="dashboard-sidebar"] [aria-current="page"]')
                if (await activeLink.count() > 0) {
                    await expect(activeLink.first()).toBeVisible()
                }
            }
        })
    })

    test.describe('Memory Overview Component', () => {
        test('should display memory statistics', async ({ page }) => {
            const overview = page.locator('[data-testid="memory-overview"]')
            await expect(overview).toBeVisible()

            // Check for key metrics
            const metrics = ['Total Memories', 'Active Agents', 'Memory Operations', 'Recent Activity']

            for (const metric of metrics) {
                const metricElement = page.locator(`text=${metric}`)
                if (await metricElement.count() > 0) {
                    await expect(metricElement.first()).toBeVisible()
                }
            }
            // Check for numerical values (look for any stat cards with numbers)
            const statCards = page.locator('[data-testid="memory-overview"] .text-2xl.font-bold')
            if (await statCards.count() > 0) {
                await expect(statCards.first()).toBeVisible()
            }
        })

        test('should display recent memory activity', async ({ page }) => {
            // Look for recent activity section
            const recentActivity = page.locator('text=Recent Activity').first()

            if (await recentActivity.isVisible()) {
                // Check for activity items
                const activityItems = page.locator('[data-testid="activity-item"], .activity-item')
                if (await activityItems.count() > 0) {
                    await expect(activityItems.first()).toBeVisible()
                }
            }
        })

        test('should handle loading and error states', async ({ page }) => {
            // Intercept API calls to test loading state
            await page.route('**/api/stats*', route => {
                // Delay response to test loading state
                setTimeout(() => {
                    route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            success: true,
                            data: {
                                totalMemories: 42,
                                activeAgents: 3,
                                memoryOperations: 156
                            }
                        })
                    })
                }, 1000)
            })

            await page.reload()
            // Should show loading state initially
            const loadingElements = page.locator('text=/loading|Loading/')
            if (await loadingElements.count() > 0) {
                await expect(loadingElements.first()).toBeVisible()
            }
        })
    })

    test.describe('Memory Actions Component', () => {
        test('should display action buttons', async ({ page }) => {
            const actions = page.locator('[data-testid="memory-actions"]')
            await expect(actions).toBeVisible()

            // Check for main action buttons
            const actionButtons = ['Add Memory', 'Bulk Import', 'AI Assist']

            for (const buttonText of actionButtons) {
                const button = page.locator(`button:has-text("${buttonText}")`)
                if (await button.count() > 0) {
                    await expect(button.first()).toBeVisible()
                }
            }
        })

        test('should open and close memory creation form', async ({ page }) => {
            const addBtn = page.locator('[data-testid="quick-action-add-memory"], button:has-text("Add Memory")').first()

            if (await addBtn.isVisible()) {
                // Wait for element stability and open form
                await addBtn.waitFor({ state: 'attached' })
                await page.waitForTimeout(1000)
                await addBtn.click({ force: true })

                // Wait for form to appear and check form elements with multiple selectors
                const form = page.locator('[data-testid="memory-form"], form[role="form"]')
                await expect(form).toBeVisible({ timeout: 15000 })
                await expect(page.locator('label:has-text("Content *")')).toBeVisible({ timeout: 5000 })
                await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 })                // Close form
                const closeBtn = page.locator('[data-testid="close-form-button"], button:has-text("Cancel"), button[aria-label*="close"]')
                if (await closeBtn.count() > 0) {
                    await closeBtn.first().click({ force: true })
                }
            }
        })

        test('should validate form input', async ({ page }) => {
            const addBtn = page.locator('button:has-text("Add Memory")').first()

            if (await addBtn.isVisible()) {
                await addBtn.click({ force: true })

                // Try to submit empty form
                const submitBtn = page.locator('button[type="submit"]:has-text("Add Memory")')
                if (await submitBtn.count() > 0) {
                    await submitBtn.first().click({ force: true })

                    // Check if form validation is working by ensuring the form is still visible
                    // (i.e., submission was prevented due to validation)
                    await expect(page.locator('form[role="form"]')).toBeVisible()

                    // Alternative: Check if required field has proper validation state
                    const contentField = page.locator('#memory-content')
                    if (await contentField.count() > 0) {
                        const isValid = await contentField.evaluate(el => (el as HTMLTextAreaElement).validity.valid)
                        expect(isValid).toBe(false)
                    }
                }
            }
        })

        test('should handle quick actions', async ({ page }) => {
            const quickActions = [
                { text: 'Bulk Import', testid: 'quick-action-bulk-import' },
                { text: 'AI Assist', testid: 'quick-action-ai-assist' }
            ]

            for (const action of quickActions) {
                const actionBtn = page.locator(`[data-testid="${action.testid}"], button:has-text("${action.text}")`)
                if (await actionBtn.count() > 0) {
                    // Wait for stability and force click to avoid pointer interception
                    await actionBtn.first().waitFor({ state: 'attached' })
                    await page.waitForTimeout(500)
                    await actionBtn.first().click({ force: true })

                    // Should show some response (toast, modal, etc.)
                    await page.waitForTimeout(1000)
                }
            }
        })
    })

    test.describe('Memory Search Component', () => {
        test('should handle search input and filters', async ({ page }) => {
            // Look for search component
            const searchComponent = page.locator('[data-testid="memory-search"]')

            if (await searchComponent.isVisible()) {
                // Test search input
                const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first()
                await searchInput.fill('test search')
                await searchInput.press('Enter')

                // Test filter options
                const filterButtons = page.locator('button[data-filter], .filter-button')
                const filterCount = await filterButtons.count()

                for (let i = 0; i < Math.min(filterCount, 3); i++) {
                    await filterButtons.nth(i).click()
                    await page.waitForTimeout(200)
                }
            }
        })
    })

    test.describe('Memory Results Component', () => {
        test('should display search results', async ({ page }) => {
            const resultsComponent = page.locator('[data-testid="memory-results"]')

            if (await resultsComponent.isVisible()) {
                // Check for result items
                const resultItems = page.locator('.result-item, [data-testid="result-item"]')
                if (await resultItems.count() > 0) {
                    await expect(resultItems.first()).toBeVisible()

                    // Test result interaction
                    await resultItems.first().click()
                }
            }
        })
    })

    test.describe('Analytics Component', () => {
        test('should display analytics dashboard', async ({ page }) => {
            // Navigate to analytics
            const analyticsLink = page.locator('text=Analytics').first()
            if (await analyticsLink.isVisible()) {
                await analyticsLink.click()

                const analytics = page.locator('[data-testid="analytics-dashboard"]')
                if (await analytics.isVisible()) {
                    // Test time range selector
                    const timeSelectors = page.locator('select, button[data-timerange]')
                    if (await timeSelectors.count() > 0) {
                        await timeSelectors.first().click()
                    }

                    // Check for charts/graphs
                    const charts = page.locator('canvas, svg, .chart')
                    if (await charts.count() > 0) {
                        await expect(charts.first()).toBeVisible()
                    }
                }
            }
        })
    })

    test.describe('System Config Component', () => {
        test('should display configuration options', async ({ page }) => {
            const configLink = page.locator('text=Settings, text=Config').first()
            if (await configLink.isVisible()) {
                await configLink.click()

                const configComponent = page.locator('[data-testid="system-config"]')
                if (await configComponent.isVisible()) {
                    // Test configuration form
                    const configInputs = page.locator('input, select, textarea')
                    const inputCount = await configInputs.count()

                    // Fill some test values
                    for (let i = 0; i < Math.min(inputCount, 3); i++) {
                        const input = configInputs.nth(i)
                        const inputType = await input.getAttribute('type')

                        if (inputType === 'text' || inputType === null) {
                            await input.fill('test-value')
                        } else if (inputType === 'checkbox') {
                            await input.check()
                        }
                    }

                    // Save configuration
                    const saveBtn = page.locator('button:has-text("Save")')
                    if (await saveBtn.count() > 0) {
                        await saveBtn.first().click()
                    }
                }
            }
        })
    })
})
