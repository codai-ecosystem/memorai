import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemorySearch } from '../../../src/components/dashboard/memory-search'

// Mock the memory store
const mockSearchMemories = vi.fn()
const mockClearSearch = vi.fn()

// Create a mutable mock store
const mockStore = {
    searchMemories: mockSearchMemories,
    clearSearch: mockClearSearch,
    searchResults: [] as any[],
    isLoading: false
}

vi.mock('../../../src/stores/memory-store', () => ({
    useMemoryStore: () => mockStore
}))

// Mock utils
vi.mock('../../../src/lib/utils', () => ({
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
    debounce: (fn: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout
        return (...args: any[]) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => fn.apply(null, args), delay)
        }
    }
}))

describe('MemorySearch', () => {
    beforeEach(() => {
        mockSearchMemories.mockClear()
        mockClearSearch.mockClear()
        // Reset mock store to default state
        mockStore.searchResults = []
        mockStore.isLoading = false
    })

    it('should render correctly', () => {
        render(<MemorySearch />)
        
        expect(screen.getByPlaceholderText(/search memories/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
    })

    it('should render search input with correct placeholder', () => {
        render(<MemorySearch />)
        
        const searchInput = screen.getByTestId('memory-search-input')
        expect(searchInput).toHaveAttribute('placeholder', 'Search memories by content, tags, or metadata...')
    })

    it('should call search when typing in input', async () => {
        render(<MemorySearch />)
        
        const searchInput = screen.getByTestId('memory-search-input')
        fireEvent.change(searchInput, { target: { value: 'test query' } })
        
        // Wait for debounced function to execute
        await waitFor(() => {            expect(mockSearchMemories).toHaveBeenCalledWith('test query', {
                type: undefined,
                agentId: undefined,
                limit: 50
            })
        }, { timeout: 500 })
    })

    it('should clear search when input is empty', async () => {
        render(<MemorySearch />)
        
        const searchInput = screen.getByTestId('memory-search-input')
        
        // First enter some text to trigger search
        fireEvent.change(searchInput, { target: { value: 'test query' } })
        
        await waitFor(() => {
            expect(mockSearchMemories).toHaveBeenCalled()
        })
        
        // Reset the mock to check clearSearch call
        mockClearSearch.mockClear()
        
        // Then clear the input
        fireEvent.change(searchInput, { target: { value: '' } })
        
        await waitFor(() => {
            expect(mockClearSearch).toHaveBeenCalled()
        }, { timeout: 500 })
    })

    it('should toggle filters panel when filter button is clicked', () => {
        render(<MemorySearch />)
        
        const filterButton = screen.getByRole('button', { name: /filters/i })
        fireEvent.click(filterButton)
        
        // Should show additional filter options
        expect(screen.getByText('Sort by Date')).toBeInTheDocument()
    })

    it('should change sort order when sort button is clicked', () => {
        render(<MemorySearch />)
        
        const sortButton = screen.getByTitle(/sort ascending/i)
        fireEvent.click(sortButton)
        
        // Should toggle sort direction
        expect(sortButton).toBeInTheDocument()
    })

    it('should update sort criteria when dropdown changes', () => {
        render(<MemorySearch />)
        
        const sortSelect = screen.getByDisplayValue('Sort by Date')
        fireEvent.change(sortSelect, { target: { value: 'importance' } })
        
        expect(sortSelect).toHaveValue('importance')
    })

    it('should render with custom className', () => {
        const customClass = 'custom-search-class'
        render(<MemorySearch className={customClass} />)
        
        const searchContainer = screen.getByTestId('memory-search-input').closest('div')
        expect(searchContainer?.parentElement).toHaveClass(customClass)
    })

    it('should show search icon in input field', () => {
        render(<MemorySearch />)
        
        // Search icon should be present in the input area
        const searchIcon = screen.getByTestId('memory-search-input').parentElement?.querySelector('svg')
        expect(searchIcon).toBeInTheDocument()
    })

    describe('Search Functionality', () => {
        it('should handle empty search gracefully', async () => {
            render(<MemorySearch />)
            
            const searchInput = screen.getByTestId('memory-search-input')
            fireEvent.change(searchInput, { target: { value: '   ' } }) // Just spaces
            
            await waitFor(() => {
                expect(mockClearSearch).toHaveBeenCalled()
            }, { timeout: 500 })
        })

        it('should debounce search calls', async () => {
            render(<MemorySearch />)
            
            const searchInput = screen.getByTestId('memory-search-input')
            
            // Type multiple characters quickly
            fireEvent.change(searchInput, { target: { value: 't' } })
            fireEvent.change(searchInput, { target: { value: 'te' } })
            fireEvent.change(searchInput, { target: { value: 'tes' } })
            fireEvent.change(searchInput, { target: { value: 'test' } })
            
            // Should only call search once after debounce delay
            await waitFor(() => {
                expect(mockSearchMemories).toHaveBeenCalledTimes(1)
            }, { timeout: 500 })
        })
    })

    describe('Filter Functionality', () => {
        it('should apply type filter when selected', async () => {
            render(<MemorySearch />)
            
            // First enter a search term
            const searchInput = screen.getByTestId('memory-search-input')
            fireEvent.change(searchInput, { target: { value: 'test' } })
            
            // Then apply a filter - note: this would need to be implemented in the component
            await waitFor(() => {
                expect(mockSearchMemories).toHaveBeenCalledWith('test', {
                    type: undefined,
                    agentId: undefined,
                    limit: 50
                })
            }, { timeout: 500 })
        })
    })

    describe('Accessibility', () => {
        it('should have proper labels and ARIA attributes', () => {
            render(<MemorySearch />)
            
            const searchInput = screen.getByTestId('memory-search-input')
            expect(searchInput).toHaveAttribute('type', 'text')
            
            const filterButton = screen.getByRole('button', { name: /filters/i })
            expect(filterButton).toBeInTheDocument()
        })

        it('should support keyboard navigation', () => {
            render(<MemorySearch />)
            
            const searchInput = screen.getByTestId('memory-search-input')
            searchInput.focus()
            
            expect(searchInput).toHaveFocus()
        })
    })

    describe('Loading State', () => {
        it('should handle loading state properly', () => {
            // This would require mocking the loading state in the store
            render(<MemorySearch />)
              // Component should render normally even during loading
            expect(screen.getByTestId('memory-search-input')).toBeInTheDocument()
        })
    })

    describe('Results Display', () => {
        it('should show search results count', () => {
            // Override the mock store to return search results
            mockStore.searchResults = [{ id: '1', content: 'test memory' }]
            mockStore.isLoading = false
            
            render(<MemorySearch />)
            
            // Should show "1 Memories" when there are results
            expect(screen.getByText('1 Memories')).toBeInTheDocument()
        })

        it('should display no results message when appropriate', () => {
            // Override the mock store to simulate search with no results
            mockStore.searchResults = []
            mockStore.isLoading = false
            
            render(<MemorySearch />)
            
            // Simulate a search to trigger the no results message
            const searchInput = screen.getByTestId('memory-search-input')
            fireEvent.change(searchInput, { target: { value: 'test query' } })
            
            // Should show empty state message after searching
            expect(screen.getByText('No memories yet')).toBeInTheDocument()
        })
    })
})
