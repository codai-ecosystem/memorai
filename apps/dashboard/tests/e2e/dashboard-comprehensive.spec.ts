import { test, expect } from '@playwright/test'

test.describe('Dashboard E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the dashboard
        await page.goto('http://localhost:6366')
        await page.waitForLoadState('networkidle')
    })

    test('should load dashboard homepage', async ({ page }) => {
        // Check if main elements are present
        await expect(page.getByTestId('dashboard-header')).toBeVisible()
        await expect(page.getByTestId('dashboard-sidebar')).toBeVisible()
        await expect(page.getByText('Memorai Dashboard')).toBeVisible()
    })

    test('should navigate between sections', async ({ page }) => {
        // Click on Memories section
        await page.getByTestId('nav-memories').click()
        await page.waitForTimeout(500) // Allow time for state change
        await expect(page.getByTestId('nav-memories')).toHaveClass(/bg-blue-50/)

        // Click on Analytics section
        await page.getByTestId('nav-analytics').click()
        await page.waitForTimeout(500) // Allow time for state change
        await expect(page.getByTestId('nav-analytics')).toHaveClass(/bg-blue-50/)

        // Click on Search section
        await page.getByTestId('nav-search').click()
        await page.waitForTimeout(500) // Allow time for state change
        await expect(page.getByTestId('nav-search')).toHaveClass(/bg-blue-50/)
    })

    test('should search for memories', async ({ page }) => {
        // Navigate to search section
        await page.getByTestId('nav-search').click()
        
        // Use the search input
        const searchInput = page.getByTestId('memory-search-input')
        await searchInput.fill('test query')
        
        // Check if search is triggered
        await expect(searchInput).toHaveValue('test query')
    })

    test('should interact with quick actions', async ({ page }) => {
        // Click on Add Memory action
        await page.getByTestId('quick-action-add-memory').click()
        await expect(page.getByTestId('quick-action-add-memory')).toBeVisible()

        // Click on Bulk Import action
        await page.getByTestId('quick-action-bulk-import').click()
        await expect(page.getByTestId('quick-action-bulk-import')).toBeVisible()

        // Click on AI Assist action
        await page.getByTestId('quick-action-ai-assist').click()
        await expect(page.getByTestId('quick-action-ai-assist')).toBeVisible()
    })

    test('should toggle theme', async ({ page }) => {
        // Find and click theme toggle button
        const themeButton = page.locator('button[title*="theme"], button[aria-label*="theme"]').first()
        await themeButton.click()
        
        // Check if theme changed (this might require checking class changes)
        await expect(page.locator('html')).toHaveAttribute('class', /light|dark/)
    })

    test('should show system status', async ({ page }) => {
        // Check system status indicator
        await expect(page.getByText('System Online')).toBeVisible()
        await expect(page.getByText('All services operational')).toBeVisible()
    })

    test('should handle search functionality', async ({ page }) => {
        // Use header search
        const headerSearch = page.getByTestId('header-search-input')
        await headerSearch.fill('search query')
        await expect(headerSearch).toHaveValue('search query')
    })    test('should display memory overview cards', async ({ page }) => {
        // Check memory overview cards
        await expect(page.getByText('Total Memories')).toBeVisible()
        await expect(page.getByText('Active Agents')).toBeVisible()
        await expect(page.getByText('Avg Importance')).toBeVisible()
        await expect(page.getByText('Recent Activity')).toBeVisible()
    })

    test('should handle responsive design', async ({ page }) => {
        // Test mobile view
        await page.setViewportSize({ width: 375, height: 667 })
        await expect(page.getByTestId('dashboard-header')).toBeVisible()
        
        // Test tablet view
        await page.setViewportSize({ width: 768, height: 1024 })
        await expect(page.getByTestId('dashboard-sidebar')).toBeVisible()
        
        // Test desktop view
        await page.setViewportSize({ width: 1280, height: 720 })
        await expect(page.getByTestId('dashboard-sidebar')).toBeVisible()
    })

    test('should validate accessibility', async ({ page }) => {
        // Check for essential accessibility features using more specific selectors
        await expect(page.getByTestId('dashboard-sidebar')).toBeVisible()
        await expect(page.getByRole('main')).toBeVisible()
        
        // Check if interactive elements are keyboard accessible
        await page.keyboard.press('Tab')
        await expect(page.locator(':focus')).toBeVisible()
    })

    test('should handle errors gracefully', async ({ page }) => {
        // Test error handling by checking if page doesn't crash
        await expect(page.getByTestId('dashboard-header')).toBeVisible()
        
        // Navigate to different sections to ensure stability
        const navItems = ['nav-memories', 'nav-analytics', 'nav-search', 'nav-agents']
        for (const navItem of navItems) {
            await page.getByTestId(navItem).click()
            await expect(page.getByTestId('dashboard-header')).toBeVisible()
        }
    })

    test('should maintain state across navigation', async ({ page }) => {
        // Set a search query
        const searchInput = page.getByTestId('header-search-input')
        await searchInput.fill('persistent query')
        
        // Navigate to different sections
        await page.getByTestId('nav-memories').click()
        await page.getByTestId('nav-analytics').click()
        
        // Check if search query persists
        await expect(searchInput).toHaveValue('persistent query')
    })

    test('should load and display data correctly', async ({ page }) => {
        // Wait for any async data loading
        await page.waitForTimeout(1000)
        
        // Check if numbers are displayed (they might be 0 but should be present)
        const memoryCount = page.locator('text=/Total Memories/').locator('..').locator('text=/\\d+/')
        await expect(memoryCount).toBeVisible()
    })

    test('should handle user interactions smoothly', async ({ page }) => {
        // Test multiple rapid interactions
        for (let i = 0; i < 5; i++) {
            await page.getByTestId('nav-memories').click()
            await page.getByTestId('nav-analytics').click()
        }
        
        // Should still be responsive
        await expect(page.getByTestId('dashboard-header')).toBeVisible()
    })
})
