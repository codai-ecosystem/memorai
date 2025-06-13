import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardSidebar } from '../../../src/components/dashboard/sidebar'

// Mock utils
vi.mock('../../../src/lib/utils', () => ({
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ')
}))

describe('DashboardSidebar', () => {
    const mockOnTabChange = vi.fn()
    const defaultProps = {
        activeTab: 'overview',
        onTabChange: mockOnTabChange
    }

    beforeEach(() => {
        mockOnTabChange.mockClear()
    })

    it('should render correctly', () => {
        render(<DashboardSidebar {...defaultProps} />)
        
        expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument()
    })

    it('should render all sidebar items', () => {
        render(<DashboardSidebar {...defaultProps} />)
        
        const sidebarItems = [
            'Overview', 'Memories', 'Search', 'Analytics', 'Agents',
            'Knowledge Graph', 'Activity Log', 'Reports', 'Security', 'Settings'
        ]
        
        sidebarItems.forEach(item => {
            expect(screen.getByText(item)).toBeInTheDocument()
        })
    })

    it('should highlight active tab', () => {
        render(<DashboardSidebar {...defaultProps} activeTab="memories" />)
        
        const memoriesButton = screen.getByTestId('nav-memories')
        expect(memoriesButton).toHaveClass('bg-blue-50', 'text-blue-700')
    })

    it('should call onTabChange when clicking a navigation item', () => {
        render(<DashboardSidebar {...defaultProps} />)
          const analyticsButton = screen.getByTestId('nav-analytics')
        fireEvent.click(analyticsButton)
        
        expect(mockOnTabChange).toHaveBeenCalledWith('analytics')
    })

    it('should toggle collapse state when clicking collapse button', () => {
        render(<DashboardSidebar {...defaultProps} />)
        
        const sidebar = screen.getByTestId('dashboard-sidebar')
        const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i })
        
        // Should start expanded
        expect(sidebar).toHaveClass('w-64')
        
        // Click to collapse
        fireEvent.click(collapseButton)
        expect(sidebar).toHaveClass('w-16')
        
        // Click to expand
        fireEvent.click(collapseButton)
        expect(sidebar).toHaveClass('w-64')
    })

    it('should render system status indicator', () => {
        render(<DashboardSidebar {...defaultProps} />)
        
        expect(screen.getByText('System Online')).toBeInTheDocument()
        expect(screen.getByText('All services operational')).toBeInTheDocument()
    })

    it('should render with custom className', () => {
        const customClass = 'custom-sidebar-class'
        render(<DashboardSidebar {...defaultProps} className={customClass} />)
        
        const sidebar = screen.getByTestId('dashboard-sidebar')
        expect(sidebar).toHaveClass(customClass)
    })

    it('should render correct icons for each navigation item', () => {
        render(<DashboardSidebar {...defaultProps} />)
        
        // Check that each nav item has its test id (which implies the icon is rendered)
        const navItems = [
            'nav-overview', 'nav-memories', 'nav-search', 'nav-analytics',
            'nav-agents', 'nav-knowledge', 'nav-activity', 'nav-reports',
            'nav-security', 'nav-settings'
        ]
        
        navItems.forEach(testId => {
            expect(screen.getByTestId(testId)).toBeInTheDocument()
        })
    })

    it('should show correct labels when expanded', () => {
        render(<DashboardSidebar {...defaultProps} />)
          expect(screen.getByText('Overview')).toBeVisible()
        expect(screen.getByText('Memories')).toBeVisible()
        expect(screen.getByText('Search')).toBeVisible()
    })

    it('should hide labels when collapsed', () => {
        render(<DashboardSidebar {...defaultProps} />)
        
        const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i })
        fireEvent.click(collapseButton)
        
        // Labels should not be visible in DOM when collapsed
        expect(screen.queryByText('Overview')).not.toBeInTheDocument()
        
        // But aria-labels should still be present for accessibility
        expect(screen.getByLabelText('Overview')).toBeInTheDocument()
    })

    describe('Accessibility', () => {
        it('should have proper ARIA labels', () => {
            render(<DashboardSidebar {...defaultProps} />)
            
            const sidebar = screen.getByTestId('dashboard-sidebar')
            expect(sidebar).toHaveAttribute('role', 'navigation')
        })

        it('should support keyboard navigation', () => {
            render(<DashboardSidebar {...defaultProps} />)
            
            const analyticsButton = screen.getByTestId('nav-analytics')
            analyticsButton.focus()
            
            fireEvent.keyDown(analyticsButton, { key: 'Enter' })
            expect(mockOnTabChange).toHaveBeenCalledWith('analytics')
            
            fireEvent.keyDown(analyticsButton, { key: ' ' })
            expect(mockOnTabChange).toHaveBeenCalledTimes(2)
        })
    })

    describe('Theme Support', () => {
        it('should render with dark mode classes', () => {
            render(<DashboardSidebar {...defaultProps} />)
            
            const sidebar = screen.getByTestId('dashboard-sidebar')
            expect(sidebar).toHaveClass('dark:bg-gray-900', 'dark:border-gray-700')
        })
    })

    describe('State Management', () => {
        it('should maintain collapse state across re-renders', () => {
            const { rerender } = render(<DashboardSidebar {...defaultProps} />)
            
            const collapseButton = screen.getByRole('button', { name: /collapse sidebar/i })
            fireEvent.click(collapseButton)
            
            // Re-render with different props
            rerender(<DashboardSidebar {...defaultProps} activeTab="search" />)
            
            const sidebar = screen.getByTestId('dashboard-sidebar')
            expect(sidebar).toHaveClass('w-16') // Should still be collapsed
        })
    })
})
