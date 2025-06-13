import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { mcpMemoryClient } from '../lib/mcp-memory-client'

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

// API functions using MCP Memory Client
const api = {
    async getMemories(params?: any): Promise<Memory[]> {
        try {
            return await mcpMemoryClient.getMemories({
                limit: params?.limit,
                query: params?.query,
                agentId: params?.agentId
            });
        } catch (error) {
            console.error('Failed to fetch memories from MCP:', error);
            return [];
        }
    },

    async getStats(): Promise<MemoryStats> {
        try {
            return await mcpMemoryClient.getStats();
        } catch (error) {
            console.error('Failed to get stats from MCP:', error);
            return {
                totalMemories: 0,
                totalAgents: 0,
                averageImportance: 0,
                memoryTypes: {},
                recentActivity: [],
                topAgents: []
            };
        }
    },

    async searchMemories(query: string, options?: any): Promise<Memory[]> {
        try {
            return await mcpMemoryClient.searchMemories(query, {
                limit: options?.limit,
                agentId: options?.agentId
            });
        } catch (error) {
            console.error('Failed to search memories in MCP:', error);
            return [];
        }
    },

    async addMemory(content: string, metadata: Partial<Memory['metadata']>): Promise<Memory> {
        try {
            return await mcpMemoryClient.addMemory(content, metadata);
        } catch (error) {
            console.error('Failed to add memory to MCP:', error);
            throw error;
        }
    },

    async deleteMemory(id: string): Promise<void> {
        try {
            // For now, we'll just log this since MCP doesn't have direct delete by memory ID
            console.log('Delete memory request for ID:', id);
            // In a real implementation, we'd need to track entity names associated with memory IDs
        } catch (error) {
            console.error('Failed to delete memory from MCP:', error);
            throw error;
        }
    },

    async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
        try {
            // For now, we'll recreate the memory since MCP doesn't have direct update
            console.log('Update memory request for ID:', id, 'with updates:', updates);
            // In a real implementation, we'd delete the old entity and create a new one
            throw new Error('Memory updates not yet implemented with MCP backend');
        } catch (error) {
            console.error('Failed to update memory in MCP:', error);
            throw error;
        }
    }
};

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
                    set({ isLoading: true, error: null });
                    try {
                        const memories = await api.getMemories(params);
                        set({ memories, isLoading: false });
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to fetch memories',
                            isLoading: false
                        });
                    }
                }, fetchStats: async () => {
                    set({ isLoading: true, error: null });
                    try {
                        console.log('Memory store: Fetching stats...');
                        const stats = await api.getStats();
                        console.log('Memory store: Stats received:', stats);
                        set({ stats, isLoading: false });
                    } catch (error) {
                        console.error('Memory store: Failed to fetch stats:', error);
                        set({
                            error: error instanceof Error ? error.message : 'Failed to fetch stats',
                            isLoading: false
                        });
                    }
                },

                searchMemories: async (query, options) => {
                    set({ isLoading: true, error: null });
                    try {
                        const searchResults = await api.searchMemories(query, options);
                        set({ searchResults, isLoading: false });
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to search memories',
                            isLoading: false
                        });
                    }
                },

                addMemory: async (content, metadata) => {
                    set({ isLoading: true, error: null });
                    try {
                        const newMemory = await api.addMemory(content, metadata);
                        const currentMemories = get().memories;
                        set({
                            memories: [newMemory, ...currentMemories],
                            isLoading: false
                        });
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to add memory',
                            isLoading: false
                        });
                        throw error;
                    }
                },

                deleteMemory: async (id) => {
                    set({ isLoading: true, error: null });
                    try {
                        await api.deleteMemory(id);
                        const currentMemories = get().memories;
                        set({
                            memories: currentMemories.filter(memory => memory.id !== id),
                            isLoading: false
                        });
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to delete memory',
                            isLoading: false
                        });
                        throw error;
                    }
                },

                updateMemory: async (id, updates) => {
                    set({ isLoading: true, error: null });
                    try {
                        const updatedMemory = await api.updateMemory(id, updates);
                        const currentMemories = get().memories;
                        set({
                            memories: currentMemories.map(memory =>
                                memory.id === id ? updatedMemory : memory
                            ),
                            isLoading: false
                        });
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to update memory',
                            isLoading: false
                        });
                        throw error;
                    }
                },

                clearSearch: () => {
                    set({ searchResults: [] });
                },

                clearError: () => {
                    set({ error: null });
                }
            }),
            {
                name: 'memory-store',
                partialize: (state) => ({
                    memories: state.memories,
                    stats: state.stats
                })
            }
        ),
        {
            name: 'memory-store'
        }
    )
);
