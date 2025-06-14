'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
    Search,
    Filter,
    SortAsc,
    SortDesc,
    ChevronDown,
    Clock,
    Tag,
    User,
    Brain,
    Trash2,
    ExternalLink,
    Copy,
    MoreHorizontal
} from 'lucide-react'
import { useMemoryStore } from '../../stores/memory-store'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

interface MemoryResultsProps {
    searchQuery?: string
    className?: string
}

export function MemoryResults({ searchQuery = '', className }: MemoryResultsProps) {
    const { memories, isLoading, deleteMemory, searchMemories } = useMemoryStore()
    const [sortBy, setSortBy] = useState<'timestamp' | 'relevance' | 'type'>('timestamp')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [filterType, setFilterType] = useState<string>('all')
    const [showFilters, setShowFilters] = useState(false)
    const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set())

    // Filter and sort memories
    const filteredAndSortedMemories = useMemo(() => {
        let filtered = memories

        // Apply search query
        if (searchQuery.trim()) {
            filtered = memories.filter(memory =>
                memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                memory.metadata?.tags?.some(tag =>
                    tag.toLowerCase().includes(searchQuery.toLowerCase())
                ) ||
                memory.metadata?.agentId?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(memory => memory.type === filterType)
        }

        // Sort memories
        const sorted = [...filtered].sort((a, b) => {
            let comparison = 0

            switch (sortBy) {
                case 'timestamp':
                    comparison = new Date(a.metadata.timestamp || 0).getTime() - new Date(b.metadata.timestamp || 0).getTime()
                    break
                case 'relevance':
                    comparison = (a.metadata?.similarity || 0) - (b.metadata?.similarity || 0)
                    break
                case 'type':
                    comparison = (a.type || '').localeCompare(b.type || '')
                    break
            }

            return sortOrder === 'desc' ? -comparison : comparison
        })

        return sorted
    }, [memories, searchQuery, filterType, sortBy, sortOrder])

    const handleDeleteMemory = async (memoryId: string) => {
        try {
            await deleteMemory(memoryId)
            setSelectedMemories(prev => {
                const next = new Set(prev)
                next.delete(memoryId)
                return next
            })
            toast.success('Memory deleted successfully')
        } catch (error) {
            toast.error('Failed to delete memory')
        }
    }

    const handleCopyContent = (content: string) => {
        navigator.clipboard.writeText(content)
        toast.success('Content copied to clipboard')
    }

    const handleBulkDelete = async () => {
        if (selectedMemories.size === 0) return

        try {
            await Promise.all(
                Array.from(selectedMemories).map(id => deleteMemory(id))
            )
            setSelectedMemories(new Set())
            toast.success(`${selectedMemories.size} memories deleted`)
        } catch (error) {
            toast.error('Failed to delete selected memories')
        }
    }

    const toggleMemorySelection = (memoryId: string) => {
        setSelectedMemories(prev => {
            const next = new Set(prev)
            if (next.has(memoryId)) {
                next.delete(memoryId)
            } else {
                next.add(memoryId)
            }
            return next
        })
    }

    const selectAllMemories = () => {
        if (selectedMemories.size === filteredAndSortedMemories.length) {
            setSelectedMemories(new Set())
        } else {
            setSelectedMemories(new Set(filteredAndSortedMemories.map(m => m.id)))
        }
    }

    const uniqueTypes = useMemo(() => {
        const types = memories.map(m => m.type).filter(Boolean)
        return Array.from(new Set(types))
    }, [memories])

    if (isLoading) {
        return (
            <div className={cn('space-y-4', className)}>
                <div className="flex items-center justify-between">
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                        <div className="flex gap-2">
                            <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
                            <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        )
    } return (
        <div className={cn('space-y-4', className)} data-testid="memory-results">
            {/* Results header with controls */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {filteredAndSortedMemories.length} {filteredAndSortedMemories.length === 1 ? 'Memory' : 'Memories'}
                    </h3>
                    {searchQuery && (
                        <span className="text-sm text-gray-500">
                            matching "{searchQuery}"
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Bulk actions */}
                    {selectedMemories.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2"
                        >
                            <span className="text-sm text-gray-600">
                                {selectedMemories.size} selected
                            </span>
                            <button
                                onClick={handleBulkDelete}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete selected"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </motion.div>
                    )}

                    {/* Filters toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors",
                            showFilters ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                        )}
                    >
                        <Filter className="h-4 w-4" />
                        Filters
                        <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            showFilters && "rotate-180"
                        )} />
                    </button>

                    {/* Sort controls */}
                    <div className="flex items-center gap-1 border rounded-lg">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-3 py-2 border-0 focus:ring-0 text-sm"
                        >
                            <option value="timestamp">Time</option>
                            <option value="relevance">Relevance</option>
                            <option value="type">Type</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-2 hover:bg-gray-50 transition-colors"
                        >
                            {sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border rounded-lg p-4 bg-gray-50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">Type:</label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="px-3 py-1 border rounded text-sm"
                                >
                                    <option value="all">All Types</option>
                                    {uniqueTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {filterType !== 'all' && (
                                <button
                                    onClick={() => setFilterType('all')}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bulk selection */}
            {filteredAndSortedMemories.length > 0 && (
                <div className="flex items-center gap-2 py-2 border-b">
                    <input
                        type="checkbox"
                        checked={selectedMemories.size === filteredAndSortedMemories.length}
                        onChange={selectAllMemories}
                        className="rounded"
                    />
                    <span className="text-sm text-gray-600">
                        Select all
                    </span>
                </div>
            )}

            {/* Memory results */}
            <div className="space-y-3">
                <AnimatePresence>
                    {filteredAndSortedMemories.map((memory, index) => (
                        <motion.div
                            key={memory.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                                "border rounded-lg p-4 transition-all hover:shadow-md",
                                selectedMemories.has(memory.id) && "ring-2 ring-blue-200 bg-blue-50"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedMemories.has(memory.id)}
                                    onChange={() => toggleMemorySelection(memory.id)}
                                    className="mt-1 rounded"
                                />

                                <div className="flex-1 min-w-0">
                                    {/* Content */}
                                    <div className="mb-3">
                                        <p className="text-gray-900 leading-relaxed break-words">
                                            {memory.content}
                                        </p>
                                    </div>

                                    {/* Metadata */}                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(memory.metadata.timestamp || 0), { addSuffix: true })}
                                        </div>

                                        {memory.metadata?.agentId && (
                                            <div className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {memory.metadata.agentId}
                                            </div>
                                        )}                                        {memory.type && (
                                            <div className="flex items-center gap-1">
                                                <Brain className="h-3 w-3" />
                                                {memory.type}
                                            </div>
                                        )}

                                        {memory.metadata?.similarity && (
                                            <div className="flex items-center gap-1">
                                                <div className="text-blue-600">
                                                    {(memory.metadata.similarity * 100).toFixed(1)}% match
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {memory.metadata?.tags && memory.metadata.tags.length > 0 && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <Tag className="h-3 w-3 text-gray-400" />
                                            <div className="flex flex-wrap gap-1">
                                                {memory.metadata.tags.map((tag, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleCopyContent(memory.content)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                        title="Copy content"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>

                                    <button
                                        onClick={() => handleDeleteMemory(memory.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Delete memory"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty state */}
            {filteredAndSortedMemories.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                >
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchQuery ? 'No memories found' : 'No memories yet'}
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        {searchQuery
                            ? `No memories match your search for "${searchQuery}". Try adjusting your search terms or filters.`
                            : 'Start adding memories to see them here. They will be organized and searchable.'
                        }
                    </p>
                </motion.div>
            )}
        </div>
    )
}
