import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { memoryApi } from '../lib/api-client'

export interface Memory {
    id: string
    content: string
    type: 'conversation' | 'document' | 'note' | 'thread' | 'task' | 'personality' | 'emotion'
    metadata: {
        agentId: string
        timestamp: string
        tags: string[]
        similarity?: number
        importance?: number
        source?: string
        entities?: string[]
        confidence?: number
    }
}

export interface MemoryStats {
    totalMemories: number
    totalAgents: number
    averageImportance: number
    memoryTypes: Record<string, number>
    recentActivity: {
        date: string
        count: number
    }[]
    topAgents: {
        agentId: string
        memoryCount: number
    }[]
}

interface MemoryState {
    memories: Memory[]
    stats: MemoryStats | null
    searchResults: Memory[]
    isLoading: boolean
    error: string | null

    // Actions
    fetchMemories: (params?: {
        limit?: number
        offset?: number
        type?: string
        agentId?: string
    }) => Promise<void>

    fetchStats: () => Promise<void>

    searchMemories: (query: string, options?: {
        type?: string
        agentId?: string
        limit?: number
    }) => Promise<void>

    addMemory: (content: string, metadata: Partial<Memory['metadata']>) => Promise<void>

    deleteMemory: (id: string) => Promise<void>

    updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>

    clearSearch: () => void
    clearError: () => void
}

// API functions with fallback to mock for development
const api = {
    async getMemories(params?: any): Promise<Memory[]> {
        try {
            // Try real API first
            const response = await memoryApi.context(params?.agentId || 'copilot-1', params?.limit || 100);
            if (response.success && response.data) {
                // Transform API response to match our Memory interface
                return response.data.map(mem => ({
                    id: mem.id,
                    content: mem.content,
                    type: (mem.metadata.type as Memory['type']) || 'note',
                    metadata: {
                        agentId: mem.agentId,
                        timestamp: mem.timestamp,
                        tags: mem.metadata.tags || [],
                        similarity: mem.metadata.similarity,
                        importance: mem.metadata.importance || 0.5,
                        source: mem.metadata.source,
                        entities: mem.metadata.entities,
                        confidence: mem.metadata.confidence || 0.8
                    }
                }));
            }
        } catch (error) {
            console.warn('API call failed, falling back to mock data:', error);
        }

        // Fallback to mock data
        return [
            {
                id: '1',
                content: 'User prefers dark mode interfaces and minimal design patterns. Mentioned liking VS Code Dark+ theme.',
                type: 'personality',
                metadata: {
                    agentId: 'copilot-1',
                    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                    tags: ['ui-preference', 'design', 'accessibility'],
                    importance: 0.8,
                    confidence: 0.95
                }
            },
            {
                id: '2',
                content: 'Working on Next.js 15 dashboard transformation project with TypeScript and Tailwind CSS.',
                type: 'task',
                metadata: {
                    agentId: 'copilot-1',
                    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                    tags: ['project', 'nextjs', 'typescript', 'tailwind'],
                    importance: 0.9,
                    confidence: 0.98
                }
            },
            {
                id: '3',
                content: 'Asked for 110% effort and perfection. Values quality and attention to detail.',
                type: 'personality',
                metadata: {
                    agentId: 'copilot-1',
                    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                    tags: ['standards', 'quality', 'expectations'],
                    importance: 0.85,
                    confidence: 0.92
                }
            },
            {
                id: '4',
                content: 'Mentioned encountering Memory MCP tool recall failures. Need to investigate and fix.',
                type: 'task',
                metadata: {
                    agentId: 'copilot-1',
                    timestamp: new Date().toISOString(),
                    tags: ['bug', 'mcp', 'memory-tools', 'urgent'],
                    importance: 0.95,
                    confidence: 0.99
                }
            }
        ];
    },

    async getStats(): Promise<MemoryStats> {
        try {
            // Try to get real stats from API
            const response = await memoryApi.context('copilot-1', 100);
            if (response.success && response.data) {
                const memories = response.data;
                const agentCounts: Record<string, number> = {};
                const typeCounts: Record<string, number> = {};
                let totalImportance = 0;
                let importanceCount = 0;

                memories.forEach(mem => {
                    agentCounts[mem.agentId] = (agentCounts[mem.agentId] || 0) + 1;
                    const type = (mem.metadata.type as string) || 'note';
                    typeCounts[type] = (typeCounts[type] || 0) + 1;

                    if (mem.metadata.importance) {
                        totalImportance += mem.metadata.importance;
                        importanceCount++;
                    }
                });

                return {
                    totalMemories: memories.length,
                    totalAgents: Object.keys(agentCounts).length,
                    averageImportance: importanceCount > 0 ? totalImportance / importanceCount : 0.5,
                    memoryTypes: typeCounts,
                    recentActivity: [
                        { date: new Date().toISOString().split('T')[0], count: memories.length },
                    ],
                    topAgents: Object.entries(agentCounts).map(([agentId, count]) => ({
                        agentId,
                        memoryCount: count
                    }))
                };
            }
        } catch (error) {
            console.warn('API stats call failed, falling back to mock data:', error);
        }

        // Fallback to mock stats
        return {
            totalMemories: 4,
            totalAgents: 1,
            averageImportance: 0.875,
            memoryTypes: {
                personality: 2,
                task: 2,
                conversation: 0,
                document: 0,
                note: 0,
                thread: 0,
                emotion: 0
            },
            recentActivity: [
                { date: new Date().toISOString().split('T')[0], count: 4 },
                { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 2 },
                { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 1 }
            ],
            topAgents: [
                { agentId: 'copilot-1', memoryCount: 4 }
            ]
        };
    },

    async searchMemories(query: string, options?: any): Promise<Memory[]> {
        try {
            // Try real API search first
            const response = await memoryApi.search(options?.agentId || 'copilot-1', query, options?.limit || 10);
            if (response.success && response.data) {
                return response.data.map(mem => ({
                    id: mem.id,
                    content: mem.content,
                    type: (mem.metadata.type as Memory['type']) || 'note',
                    metadata: {
                        agentId: mem.agentId,
                        timestamp: mem.timestamp,
                        tags: mem.metadata.tags || [],
                        similarity: mem.metadata.similarity,
                        importance: mem.metadata.importance || 0.5,
                        source: mem.metadata.source,
                        entities: mem.metadata.entities,
                        confidence: mem.metadata.confidence || 0.8
                    }
                }));
            }
        } catch (error) {
            console.warn('API search failed, falling back to mock search:', error);
        }

        // Fallback to mock search
        const allMemories = await this.getMemories();
        return allMemories.filter(memory =>
            memory.content.toLowerCase().includes(query.toLowerCase()) ||
            memory.metadata.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
    },

    async addMemory(content: string, metadata: Partial<Memory['metadata']>): Promise<Memory> {
        try {
            // Try real API add first
            const fullMetadata = {
                agentId: 'copilot-1',
                timestamp: new Date().toISOString(),
                tags: [],
                importance: 0.5,
                confidence: 0.8,
                ...metadata
            };

            const response = await memoryApi.create(fullMetadata.agentId, content, fullMetadata);
            if (response.success && response.data) {
                return {
                    id: response.data.id,
                    content: response.data.content,
                    type: (response.data.metadata.type as Memory['type']) || 'note',
                    metadata: {
                        agentId: response.data.agentId,
                        timestamp: response.data.timestamp,
                        tags: response.data.metadata.tags || [],
                        similarity: response.data.metadata.similarity,
                        importance: response.data.metadata.importance || 0.5,
                        source: response.data.metadata.source,
                        entities: response.data.metadata.entities,
                        confidence: response.data.metadata.confidence || 0.8
                    }
                };
            }
        } catch (error) {
            console.warn('API add memory failed, falling back to mock:', error);
        }

        // Fallback to mock add
        return {
            id: Date.now().toString(),
            content,
            type: metadata.tags?.includes('task') ? 'task' : 'note',
            metadata: {
                agentId: 'copilot-1',
                timestamp: new Date().toISOString(),
                tags: [],
                importance: 0.5,
                confidence: 0.8,
                ...metadata
            }
        };
    },

    async deleteMemory(id: string): Promise<void> {
        try {
            // Try real API delete first
            const response = await memoryApi.delete('copilot-1', id);
            if (response.success) {
                return;
            }
        } catch (error) {
            console.warn('API delete failed, continuing with mock behavior:', error);
        }

        // Mock always succeeds
        await new Promise(resolve => setTimeout(resolve, 200));
    },

    async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
        // For now, just return the updated memory since the API doesn't have an update endpoint
        // This would need to be implemented as delete + create in the real API
        const memories = await this.getMemories();
        const memory = memories.find(m => m.id === id);
        if (!memory) throw new Error('Memory not found');

        return { ...memory, ...updates };
    }
}

export const useMemoryStore = create<MemoryState>()(
    devtools(
        persist(
            (set, get) => ({
                memories: [],
                stats: null,
                searchResults: [],
                isLoading: false,
                error: null,

                fetchMemories: async (params) => {
                    try {
                        set({ isLoading: true, error: null })
                        const memories = await api.getMemories(params)
                        set({ memories, isLoading: false })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to fetch memories',
                            isLoading: false
                        })
                    }
                },

                fetchStats: async () => {
                    try {
                        set({ isLoading: true, error: null })
                        const stats = await api.getStats()
                        set({ stats, isLoading: false })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to fetch stats',
                            isLoading: false
                        })
                    }
                },

                searchMemories: async (query, options) => {
                    try {
                        set({ isLoading: true, error: null })
                        const searchResults = await api.searchMemories(query, options)
                        set({ searchResults, isLoading: false })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Search failed',
                            isLoading: false
                        })
                    }
                },

                addMemory: async (content, metadata) => {
                    try {
                        set({ isLoading: true, error: null })
                        const newMemory = await api.addMemory(content, metadata)
                        const { memories } = get()
                        set({
                            memories: [newMemory, ...memories],
                            isLoading: false
                        })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to add memory',
                            isLoading: false
                        })
                    }
                },

                deleteMemory: async (id) => {
                    try {
                        set({ isLoading: true, error: null })
                        await api.deleteMemory(id)
                        const { memories } = get()
                        set({
                            memories: memories.filter(m => m.id !== id),
                            isLoading: false
                        })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to delete memory',
                            isLoading: false
                        })
                    }
                },

                updateMemory: async (id, updates) => {
                    try {
                        set({ isLoading: true, error: null })
                        const updatedMemory = await api.updateMemory(id, updates)
                        const { memories } = get()
                        set({
                            memories: memories.map(m => m.id === id ? updatedMemory : m),
                            isLoading: false
                        })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to update memory',
                            isLoading: false
                        })
                    }
                },

                clearSearch: () => set({ searchResults: [] }),
                clearError: () => set({ error: null })
            }),
            {
                name: 'memory-store',
                partialize: (state) => ({
                    memories: state.memories,
                    stats: state.stats
                })
            }
        ),
        { name: 'memory-store' }
    )
)
