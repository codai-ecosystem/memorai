import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Create hoisted mock functions
const mockToast = vi.hoisted(() => {
    const mockFn = vi.fn() as any
    mockFn.success = vi.fn()
    mockFn.error = vi.fn()
    mockFn.info = vi.fn()
    mockFn.warning = vi.fn()
    return mockFn
})

const mockMemoryStore = vi.hoisted(() => ({
    addMemory: vi.fn(),
    isLoading: false,
}))

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
    default: mockToast,
}))

// Mock the memory store
vi.mock('../../../src/stores/memory-store', () => ({
    useMemoryStore: () => mockMemoryStore,
}))

// Mock utils
vi.mock('../../../src/lib/utils', () => ({
    cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

// Import component after mocks
import { MemoryActions } from '../../../src/components/dashboard/memory-actions'

describe('MemoryActions - Comprehensive Testing', () => {
    let user: ReturnType<typeof userEvent.setup>

    beforeEach(() => {
        vi.clearAllMocks()
        user = userEvent.setup()
    })

    describe('Rendering and Structure', () => {
        it('should render the memory actions header', () => {
            render(<MemoryActions />)

            expect(screen.getByText('Memory Actions')).toBeInTheDocument()
            expect(screen.getByText('Create, manage, and organize your memories')).toBeInTheDocument()
        })

        it('should render with custom className', () => {
            const { container } = render(<MemoryActions className="custom-actions" />)
            expect(container.firstChild).toHaveClass('custom-actions')
        })

        it('should render all quick action buttons', () => {
            render(<MemoryActions />)

            expect(screen.getByText('Add Memory')).toBeInTheDocument()
            expect(screen.getByText('Bulk Import')).toBeInTheDocument()
            expect(screen.getByText('AI Assist')).toBeInTheDocument()
        })

        it('should render quick action descriptions', () => {
            render(<MemoryActions />)

            expect(screen.getByText('Create a new memory entry')).toBeInTheDocument()
            expect(screen.getByText('Import memories from file')).toBeInTheDocument()
            expect(screen.getByText('Get AI suggestions for memory organization')).toBeInTheDocument()
        })

        it('should have proper button layout and styling', () => {
            render(<MemoryActions />)

            const actionsGrid = screen.getByTestId('quick-action-add-memory').parentElement
            expect(actionsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3')
        })
    })
    describe('Quick Actions Functionality', () => {
        it('should open add memory form when Add Memory is clicked', async () => {
            render(<MemoryActions />)

            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            expect(screen.getByText('Add New Memory')).toBeInTheDocument()
            expect(screen.getByLabelText('Content *')).toBeInTheDocument()
        })

        it('should show toast for bulk import feature', async () => {
            render(<MemoryActions />)

            const bulkImportButton = screen.getByTestId('quick-action-bulk-import')
            await user.click(bulkImportButton)

            expect(mockToast).toHaveBeenCalledWith('Bulk import feature coming soon!')
        })

        it('should show toast for AI assist feature', async () => {
            render(<MemoryActions />)

            const aiAssistButton = screen.getByTestId('quick-action-ai-assist')
            await user.click(aiAssistButton)

            expect(mockToast).toHaveBeenCalledWith('AI assist feature coming soon!')
        })

        it('should have proper hover effects on quick action buttons', () => {
            render(<MemoryActions />)

            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            expect(addMemoryButton).toHaveClass('hover:border-blue-300', 'dark:hover:border-blue-600')
        })
    })
    describe('Add Memory Form', () => {
        beforeEach(async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)
        })

        it('should render all form fields', () => {
            expect(screen.getByLabelText('Content *')).toBeInTheDocument()
            expect(screen.getByLabelText('Type')).toBeInTheDocument()
            expect(screen.getByLabelText('Tags')).toBeInTheDocument()
            expect(screen.getByText(/Importance:/)).toBeInTheDocument()
        })

        it('should have proper form field types and attributes', () => {
            const contentField = screen.getByLabelText('Content *')
            const typeField = screen.getByLabelText('Type')
            const tagsField = screen.getByLabelText('Tags')
            const importanceField = screen.getByDisplayValue('0.5')

            expect(contentField.tagName).toBe('TEXTAREA')
            expect(contentField).toHaveAttribute('required')
            expect(typeField.tagName).toBe('SELECT')
            expect(tagsField).toHaveAttribute('type', 'text')
            expect(importanceField).toHaveAttribute('type', 'range')
        })

        it('should have all memory type options', () => {
            const typeSelect = screen.getByLabelText('Type')

            expect(typeSelect).toContainHTML('<option value="note">Note</option>')
            expect(typeSelect).toContainHTML('<option value="task">Task</option>')
            expect(typeSelect).toContainHTML('<option value="conversation">Conversation</option>')
            expect(typeSelect).toContainHTML('<option value="document">Document</option>')
            expect(typeSelect).toContainHTML('<option value="thread">Thread</option>')
            expect(typeSelect).toContainHTML('<option value="personality">Personality</option>')
            expect(typeSelect).toContainHTML('<option value="emotion">Emotion</option>')
        })

        it('should close form when X button is clicked', async () => {
            const closeButton = screen.getByTestId('close-form-button')
            await user.click(closeButton)

            expect(screen.queryByText('Add New Memory')).not.toBeInTheDocument()
        })

        it('should close form when Cancel button is clicked', async () => {
            const cancelButton = screen.getByText('Cancel')
            await user.click(cancelButton)

            expect(screen.queryByText('Add New Memory')).not.toBeInTheDocument()
        })
    })
    describe('Form Input Handling', () => {
        beforeEach(async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)
        })

        it('should handle content input changes', async () => {
            const contentField = screen.getByLabelText('Content *')

            await user.type(contentField, 'Test memory content')

            expect(contentField).toHaveValue('Test memory content')
        })

        it('should handle type selection changes', async () => {
            const typeField = screen.getByLabelText('Type')

            await user.selectOptions(typeField, 'task')

            expect(typeField).toHaveValue('task')
        })

        it('should handle tags input changes', async () => {
            const tagsField = screen.getByLabelText('Tags')

            await user.type(tagsField, 'tag1, tag2, tag3')

            expect(tagsField).toHaveValue('tag1, tag2, tag3')
        })

        it('should handle importance slider changes', async () => {
            const importanceSlider = screen.getByDisplayValue('0.5')

            fireEvent.change(importanceSlider, { target: { value: '0.8' } })

            expect(importanceSlider).toHaveValue('0.8')
            expect(screen.getByText('Importance: 80%')).toBeInTheDocument()
        })

        it('should update importance percentage display', async () => {
            const importanceSlider = screen.getByDisplayValue('0.5')

            // Test various values
            fireEvent.change(importanceSlider, { target: { value: '0.3' } })
            expect(screen.getByText('Importance: 30%')).toBeInTheDocument()

            fireEvent.change(importanceSlider, { target: { value: '1' } })
            expect(screen.getByText('Importance: 100%')).toBeInTheDocument()

            fireEvent.change(importanceSlider, { target: { value: '0' } })
            expect(screen.getByText('Importance: 0%')).toBeInTheDocument()
        })
    })
    describe('Form Submission', () => {
        beforeEach(async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)
        })

        it('should submit form with valid data', async () => {
            mockMemoryStore.addMemory.mockResolvedValue(undefined)

            const contentField = screen.getByLabelText('Content *')
            const tagsField = screen.getByLabelText('Tags')
            const submitButton = screen.getByTestId('submit-memory-button')

            await user.type(contentField, 'Test memory content')
            await user.type(tagsField, 'tag1, tag2, tag3')

            await user.click(submitButton)

            expect(mockMemoryStore.addMemory).toHaveBeenCalledWith('Test memory content', {
                tags: ['tag1', 'tag2', 'tag3'],
                importance: 0.5,
                source: 'dashboard',
            })
        })

        it('should show success toast and reset form after successful submission', async () => {
            mockMemoryStore.addMemory.mockResolvedValue(undefined)

            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const contentField = screen.getByLabelText('Content *')
            const form = screen.getByRole('form')

            await user.type(contentField, 'Test content')
            fireEvent.submit(form)

            await waitFor(() => {
                expect(mockToast.success).toHaveBeenCalledWith('Memory added successfully!')
            })

            // Form should be closed
            expect(screen.queryByText('Add New Memory')).not.toBeInTheDocument()
        })

        it('should show error toast for empty content', async () => {
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const form = screen.getByRole('form')
            fireEvent.submit(form)

            await waitFor(() => {
                expect(mockToast.error).toHaveBeenCalledWith('Content is required')
            })
            expect(mockMemoryStore.addMemory).not.toHaveBeenCalled()
        })

        it('should show error toast for whitespace-only content', async () => {
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const contentField = screen.getByLabelText('Content *')
            const form = screen.getByRole('form')

            await user.type(contentField, '   ')
            fireEvent.submit(form)

            await waitFor(() => {
                expect(mockToast.error).toHaveBeenCalledWith('Content is required')
            })
            expect(mockMemoryStore.addMemory).not.toHaveBeenCalled()
        })

        it('should handle API errors gracefully', async () => {
            mockMemoryStore.addMemory.mockRejectedValue(new Error('API Error'))

            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const contentField = screen.getByLabelText('Content *')
            const form = screen.getByRole('form')

            await user.type(contentField, 'Test content')
            fireEvent.submit(form)

            await waitFor(() => {
                expect(mockToast.error).toHaveBeenCalledWith('Failed to add memory')
            })
        })

        it('should handle tags parsing correctly', async () => {
            mockMemoryStore.addMemory.mockResolvedValue(undefined)

            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const contentField = screen.getByLabelText('Content *')
            const tagsField = screen.getByLabelText('Tags')
            const form = screen.getByRole('form')

            // Test various tag formats
            await user.type(contentField, 'Test content')
            await user.type(tagsField, 'tag1,tag2,  tag3  , , tag4')

            fireEvent.submit(form)

            await waitFor(() => {
                expect(mockMemoryStore.addMemory).toHaveBeenCalledWith('Test content', {
                    tags: ['tag1', 'tag2', 'tag3', 'tag4'], // Empty tags should be filtered out
                    importance: 0.5,
                    source: 'dashboard',
                })
            })
        })

        it('should handle empty tags gracefully', async () => {
            mockMemoryStore.addMemory.mockResolvedValue(undefined)

            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const contentField = screen.getByLabelText('Content *')
            const form = screen.getByRole('form')

            await user.type(contentField, 'Test content')
            // Leave tags empty

            fireEvent.submit(form)

            await waitFor(() => {
                expect(mockMemoryStore.addMemory).toHaveBeenCalledWith('Test content', {
                    tags: [],
                    importance: 0.5,
                    source: 'dashboard',
                })
            })
        })
    })

    describe('Loading States', () => {
        beforeEach(async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)
        })

        it('should show loading state during submission', async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getAllByTestId('quick-action-add-memory')[0]
            await user.click(addMemoryButton)

            // Fill out the form
            const contentTextarea = screen.getByLabelText(/content/i)
            await user.type(contentTextarea, 'Test memory content')

            // Mock the store to be in loading state
            mockMemoryStore.isLoading = true

            // Re-render to reflect the loading state
            const { rerender } = render(<MemoryActions />)
            await user.click(screen.getAllByTestId('quick-action-add-memory')[0])

            // Check if the button shows loading text
            expect(screen.getByText('Adding...')).toBeInTheDocument()
        })

        it('should disable submit button when loading', async () => {
            mockMemoryStore.isLoading = true

            render(<MemoryActions />)
            const addMemoryButton = screen.getAllByTestId('quick-action-add-memory')[0]
            await user.click(addMemoryButton)

            const submitButton = screen.getByTestId('submit-memory-button')
            expect(submitButton).toBeDisabled()
        })
    })

    describe('Accessibility and UX', () => {
        it('should have proper form labels and structure', async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            // Check for proper labels
            expect(screen.getByLabelText('Content *')).toBeInTheDocument()
            expect(screen.getByLabelText('Type')).toBeInTheDocument()
            expect(screen.getByLabelText('Tags')).toBeInTheDocument()

            // Check for required field indicator
            expect(screen.getByText('Content *')).toBeInTheDocument()
        })

        it('should have proper placeholder texts', async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            expect(screen.getByPlaceholderText('Enter memory content...')).toBeInTheDocument()
            expect(screen.getByPlaceholderText('tag1, tag2, tag3...')).toBeInTheDocument()
        })

        it('should support keyboard navigation', async () => {
            render(<MemoryActions />)

            // Tab through quick actions
            await user.tab()
            expect(screen.getByTestId('quick-action-add-memory')).toHaveFocus()

            await user.tab()
            expect(screen.getByText('Bulk Import').closest('button')).toHaveFocus()

            await user.tab()
            expect(screen.getByText('AI Assist').closest('button')).toHaveFocus()
        })

        it('should support form keyboard navigation', async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            // Test Tab navigation through form fields
            const contentField = screen.getByLabelText('Content *')
            contentField.focus()

            await user.tab()
            expect(screen.getByLabelText('Type')).toHaveFocus()

            await user.tab()
            expect(screen.getByLabelText('Tags')).toHaveFocus()
        })

        it('should have proper ARIA attributes', async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const form = screen.getByLabelText('Content *').closest('form')
            expect(form).toBeInTheDocument()

            // Required field should be marked as such
            const contentField = screen.getByLabelText('Content *')
            expect(contentField).toHaveAttribute('required')
        })
    })

    describe('Responsive Design and Styling', () => {
        it('should have responsive grid layout for quick actions', () => {
            render(<MemoryActions />)            // Find the grid container properly by finding the actions grid container
            const actionsGrid = screen.getByTestId('quick-action-add-memory').parentElement
            expect(actionsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3')
        })

        it('should have proper spacing and styling classes', () => {
            const { container } = render(<MemoryActions />)

            expect(container.firstChild).toHaveClass('p-6', 'space-y-6')
        })

        it('should have proper form styling', async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const form = screen.getByLabelText('Content *').closest('form')
            expect(form).toHaveClass('space-y-4')

            const formContainer = form?.closest('div')
            expect(formContainer).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-lg')
        })
    })
    describe('Edge Cases and Error Handling', () => {
        it('should handle very long content gracefully', async () => {
            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const contentField = screen.getByLabelText('Content *')
            const longContent = 'a'.repeat(1000) // Reduce length to avoid timeout

            // Use fireEvent.change for long text instead of user.type
            fireEvent.change(contentField, { target: { value: longContent } })

            expect(contentField).toHaveValue(longContent)
        })

        it('should handle special characters in content and tags', async () => {
            mockMemoryStore.addMemory.mockResolvedValue(undefined)

            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const contentField = screen.getByLabelText('Content *')
            const tagsField = screen.getByLabelText('Tags')
            const form = screen.getByRole('form')
            const specialContent = 'Content with special chars: !@#$%^&*()_+'
            const specialTags = 'tag-1, tag_2, tag@3, tag#4'

            // Use fireEvent.change for special characters to avoid userEvent issues
            fireEvent.change(contentField, { target: { value: specialContent } })
            fireEvent.change(tagsField, { target: { value: specialTags } })
            fireEvent.submit(form)

            await waitFor(() => {
                expect(mockMemoryStore.addMemory).toHaveBeenCalledWith(specialContent, {
                    tags: ['tag-1', 'tag_2', 'tag@3', 'tag#4'],
                    importance: 0.5,
                    source: 'dashboard',
                })
            })
        })

        it('should handle rapid form submissions', async () => {
            mockMemoryStore.addMemory.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const contentField = screen.getByLabelText('Content *')
            const form = screen.getByRole('form')

            await user.type(contentField, 'Test content')

            // Rapidly submit form multiple times
            fireEvent.submit(form)
            fireEvent.submit(form)
            fireEvent.submit(form)            // Should call addMemory for each submit event
            await waitFor(() => {
                expect(mockMemoryStore.addMemory).toHaveBeenCalledTimes(3)
            })
        })

        it('should maintain form state during errors', async () => {
            mockMemoryStore.addMemory.mockRejectedValue(new Error('API Error'))

            render(<MemoryActions />)
            const addMemoryButton = screen.getByTestId('quick-action-add-memory')
            await user.click(addMemoryButton)

            const contentField = screen.getByLabelText('Content *')
            const tagsField = screen.getByLabelText('Tags')
            const form = screen.getByRole('form')

            await user.type(contentField, 'Test content')
            await user.type(tagsField, 'test-tag')
            fireEvent.submit(form)

            await waitFor(() => {
                expect(mockToast.error).toHaveBeenCalledWith('Failed to add memory')
            })

            // Form should still be open with content preserved
            expect(screen.getByText('Add New Memory')).toBeInTheDocument()
            expect(contentField).toHaveValue('Test content')
            expect(tagsField).toHaveValue('test-tag')
        })
    })
})
