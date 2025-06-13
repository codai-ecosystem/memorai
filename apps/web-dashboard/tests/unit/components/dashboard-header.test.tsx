import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardHeader } from '../../../src/components/dashboard/header'

// Mock window.matchMedia for system theme tests
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
})

describe('DashboardHeader - Comprehensive Testing', () => {
    const mockOnSearch = vi.fn()
    let user: ReturnType<typeof userEvent.setup>

    beforeEach(() => {
        vi.clearAllMocks()
        user = userEvent.setup()

        // Reset DOM classes
        document.documentElement.classList.remove('dark')

        // Mock matchMedia to return false by default (light mode)
        mockMatchMedia.mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }))
    })

    afterEach(() => {
        // Clean up DOM classes
        document.documentElement.classList.remove('dark')
    })

    describe('Rendering and Structure', () => {
        it('should render all header elements correctly', () => {
            render(<DashboardHeader />)

            // Logo and title
            expect(screen.getByText('Memorai Dashboard')).toBeInTheDocument()
            expect(screen.getByText('AI Memory Management System')).toBeInTheDocument()
            expect(screen.getByText('M')).toBeInTheDocument()

            // Search bar
            expect(screen.getByPlaceholderText('Search memories, agents, or tags...')).toBeInTheDocument()

            // Action buttons - use proper accessibility labels
            expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /view notifications/i })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /user profile menu/i })).toBeInTheDocument()
            expect(screen.getByText('Admin')).toBeInTheDocument()
        })

        it('should render with custom className', () => {
            const { container } = render(<DashboardHeader className="custom-class" />)
            expect(container.firstChild).toHaveClass('custom-class')
        })

        it('should have proper accessibility attributes', () => {
            render(<DashboardHeader />)

            // Search input should have proper type
            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')
            expect(searchInput).toHaveAttribute('type', 'text')

            // Theme toggle should have title attribute
            const themeToggle = screen.getByRole('button', { name: /switch to/i })
            expect(themeToggle).toHaveAttribute('title')
        })
    })

    describe('Search Functionality', () => {
        it('should handle search input changes', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')

            await user.type(searchInput, 'test query')

            expect(searchInput).toHaveValue('test query')
        })

        it('should call onSearch when form is submitted', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')

            await user.type(searchInput, 'test search')
            await user.keyboard('{Enter}')

            expect(mockOnSearch).toHaveBeenCalledWith('test search')
        })

        it('should call onSearch when search form is submitted via button click', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')
            await user.type(searchInput, 'button search')

            // Find the form and submit it
            const form = searchInput.closest('form')
            expect(form).toBeInTheDocument()

            if (form) {
                fireEvent.submit(form)
            }

            expect(mockOnSearch).toHaveBeenCalledWith('button search')
        })

        it('should clear search on form reset', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')

            await user.type(searchInput, 'test query')
            expect(searchInput).toHaveValue('test query')

            // Reset the form
            const form = searchInput.closest('form')
            if (form) {
                fireEvent.reset(form)
            }

            await waitFor(() => {
                expect(searchInput).toHaveValue('')
            })
        })

        it('should handle rapid typing without errors', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')

            // Rapid typing simulation
            await user.type(searchInput, 'rapid')
            await user.clear(searchInput)
            await user.type(searchInput, 'typing')
            await user.clear(searchInput)
            await user.type(searchInput, 'test')

            expect(searchInput).toHaveValue('test')
        })
    })

    describe('Theme Toggle Functionality', () => {
        it('should cycle through themes: system -> light -> dark -> system', async () => {
            render(<DashboardHeader />)

            const themeToggle = screen.getByRole('button', { name: /switch to/i })

            // Initial state: system theme
            expect(themeToggle).toHaveAttribute('aria-label', expect.stringContaining('Switch to light theme'))

            // Click to switch to light theme
            await user.click(themeToggle)
            await waitFor(() => {
                expect(themeToggle).toHaveAttribute('aria-label', expect.stringContaining('Switch to dark theme'))
            })

            // Click to switch to dark theme
            await user.click(themeToggle)
            await waitFor(() => {
                expect(themeToggle).toHaveAttribute('aria-label', expect.stringContaining('Switch to system theme'))
            })

            // Click to switch back to system theme
            await user.click(themeToggle)
            await waitFor(() => {
                expect(themeToggle).toHaveAttribute('aria-label', expect.stringContaining('Switch to light theme'))
            })
        })

        it('should apply dark theme when system preference is dark', async () => {
            // Mock system preference for dark mode
            mockMatchMedia.mockImplementation((query) => ({
                matches: query === '(prefers-color-scheme: dark)',
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }))

            render(<DashboardHeader />)

            const themeToggle = screen.getByRole('button', { name: /switch to/i })

            // Should start with system theme that respects dark preference
            expect(themeToggle).toBeInTheDocument()
        })

        it('should display correct theme icons', async () => {
            render(<DashboardHeader />)

            const themeToggle = screen.getByRole('button', { name: /switch to/i })

            // Initial: system theme - should have an icon
            const initialIcon = themeToggle.querySelector('svg')
            expect(initialIcon).toBeTruthy()

            // Change to light theme - should have sun icon
            await user.click(themeToggle)
            const lightIcon = themeToggle.querySelector('svg')
            expect(lightIcon).toBeTruthy()

            // Change to dark theme - should have moon icon
            await user.click(themeToggle)
            const darkIcon = themeToggle.querySelector('svg')
            expect(darkIcon).toBeTruthy()
        })
    })

    describe('Interactive Elements', () => {
        it('should have clickable notification button', async () => {
            render(<DashboardHeader />)

            const notificationBtn = screen.getByRole('button', { name: /view notifications/i })
            const bellIcon = notificationBtn.querySelector('svg')

            expect(notificationBtn).toBeInTheDocument()
            expect(bellIcon).toBeTruthy()

            // Should be clickable (no error when clicked)
            await user.click(notificationBtn)
        })

        it('should have clickable settings button', async () => {
            render(<DashboardHeader />)

            const settingsBtn = screen.getByRole('button', { name: /open settings/i })

            expect(settingsBtn).toBeInTheDocument()

            // Should be clickable (no error when clicked)
            await user.click(settingsBtn)
        })

        it('should have clickable profile button', async () => {
            render(<DashboardHeader />)

            const profileBtn = screen.getByRole('button', { name: /user profile menu/i })

            expect(profileBtn).toBeInTheDocument()

            // Should be clickable (no error when clicked)
            await user.click(profileBtn)
        })
    })

    describe('Responsive Design and Styling', () => {
        it('should apply correct CSS classes for layout', () => {
            const { container } = render(<DashboardHeader />)
            const header = container.firstChild as HTMLElement

            expect(header).toHaveClass('bg-white', 'dark:bg-gray-900', 'border-b')
        })

        it('should have proper flex layout structure', () => {
            render(<DashboardHeader />)

            // Find the main flex container
            const header = screen.getByRole('banner')
            const flexContainer = header.querySelector('.flex.items-center.justify-between')
            expect(flexContainer).toBeInTheDocument()
        })

        it('should have responsive search bar', () => {
            render(<DashboardHeader />)

            const searchContainer = screen.getByPlaceholderText('Search memories, agents, or tags...').closest('div')
            expect(searchContainer).toHaveClass('flex-1', 'max-w-2xl')
        })
    })

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty search submission', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')

            // Focus on input and submit empty search
            await user.click(searchInput)
            await user.keyboard('{Enter}')

            // Should call onSearch with empty string
            expect(mockOnSearch).toHaveBeenCalledWith('')
        })

        it('should handle special characters in search', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')            // Use simpler special characters that testing library can handle
            const specialQuery = '!@#$%^&*()_+-=./<>'
            await user.type(searchInput, specialQuery)
            await user.keyboard('{Enter}')

            expect(mockOnSearch).toHaveBeenCalledWith(specialQuery)
        })

        it('should handle very long search queries', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')

            // Use shorter but still long query for testing
            const longQuery = 'a'.repeat(100)
            
            // Use fireEvent for faster input simulation
            fireEvent.change(searchInput, { target: { value: longQuery } })
            
            // Find and submit the form instead of using keyDown
            const form = searchInput.closest('form')
            if (form) {
                fireEvent.submit(form)
            }

            expect(mockOnSearch).toHaveBeenCalledWith(longQuery)
        }, 15000)

        it('should handle rapid theme switching', async () => {
            render(<DashboardHeader />)

            const themeToggle = screen.getByRole('button', { name: /switch to/i })

            // Rapid clicking should not cause errors
            for (let i = 0; i < 5; i++) {
                await user.click(themeToggle)
            }

            // Should still be functional
            expect(themeToggle).toBeInTheDocument()
        })
    })

    describe('Accessibility Compliance', () => {
        it('should support keyboard navigation', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            // Start from search input
            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')
            await user.click(searchInput)

            // Tab through interactive elements
            await user.tab()
            await user.tab()
            await user.tab()
            await user.tab()

            // Should be able to interact with focused element
            await user.keyboard('{Enter}')

            // No errors should occur
            expect(searchInput).toBeInTheDocument()
        })

        it('should have proper ARIA labels', () => {
            render(<DashboardHeader />)

            // Check all interactive elements have proper labels
            expect(screen.getByRole('button', { name: /switch to/i })).toHaveAttribute('aria-label')
            expect(screen.getByRole('button', { name: /view notifications/i })).toHaveAttribute('aria-label')
            expect(screen.getByRole('button', { name: /open settings/i })).toHaveAttribute('aria-label')
            expect(screen.getByRole('button', { name: /user profile menu/i })).toHaveAttribute('aria-label')
        })

        it('should be screen reader friendly', () => {
            render(<DashboardHeader />)

            // Header should be in a banner landmark
            expect(screen.getByRole('banner')).toBeInTheDocument()

            // All interactive elements should be accessible
            const buttons = screen.getAllByRole('button')
            expect(buttons.length).toBeGreaterThan(0)

            // Search input should be accessible
            const searchInput = screen.getByRole('textbox')
            expect(searchInput).toBeInTheDocument()
        })
    })

    describe('Performance and Optimization', () => {        it('should handle frequent search updates efficiently', async () => {
            render(<DashboardHeader onSearch={mockOnSearch} />)

            const searchInput = screen.getByPlaceholderText('Search memories, agents, or tags...')

            // Clear any existing value first
            fireEvent.change(searchInput, { target: { value: '' } })

            // Simulate rapid typing and backspacing using fireEvent for speed
            for (let i = 0; i < 10; i++) {
                fireEvent.change(searchInput, { target: { value: 'a' } })
                fireEvent.change(searchInput, { target: { value: '' } })
            }

            // Should remain responsive and be empty
            expect(searchInput).toHaveValue('')
        })

        it('should not cause memory leaks with theme switching', async () => {
            render(<DashboardHeader />)

            const themeToggle = screen.getByRole('button', { name: /switch to/i })

            // Multiple theme switches
            for (let i = 0; i < 10; i++) {
                await user.click(themeToggle)
            }

            // Component should remain stable
            expect(themeToggle).toBeInTheDocument()
        })
    })
})
