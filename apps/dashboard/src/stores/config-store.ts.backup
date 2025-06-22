import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { configApi } from '../lib/api-client'

export interface SystemConfig {
    memory: {
        maxMemories: number
        retentionDays: number
        enableEmbeddings: boolean
        provider: 'openai' | 'azure' | 'local' | 'mock'
        model: string
        openaiApiKey?: string
        enableCache?: boolean
    }
    api: {
        baseUrl: string
        timeout: number
        retryAttempts: number
        rateLimit: number
    }
    ui: {
        theme: 'light' | 'dark' | 'system'
        compactMode: boolean
        showAdvancedFeatures: boolean
        enableAnimations: boolean
    }
    security: {
        encryptionEnabled: boolean
        sessionTimeout: number
        enableAuditLog: boolean
        enableEncryption?: boolean
        encryptionKey?: string
    }
    database?: {
        type: string
        host: string
        collection: string
        dimensions: number
    }
    performance?: {
        queryTimeout: number
        cacheSize: number
        batchSize: number
        enablePreloading: boolean
    }
}

interface ConfigState {
    config: SystemConfig | null
    isLoading: boolean
    error: string | null

    // Actions
    fetchConfig: () => Promise<void>
    updateConfig: (updates: Partial<SystemConfig>) => Promise<void>
    resetConfig: () => Promise<void>
    testConnection: () => Promise<{ success: boolean; error?: string }>
    clearError: () => void
}

// Mock configuration for development
const defaultConfig: SystemConfig = {
    memory: {
        maxMemories: 10000,
        retentionDays: 365,
        enableEmbeddings: true,
        provider: 'openai',
        model: 'text-embedding-3-small',
        openaiApiKey: '',
        enableCache: true
    },
    api: {
        baseUrl: '/api',
        timeout: 30000,
        retryAttempts: 3,
        rateLimit: 100
    },
    ui: {
        theme: 'system',
        compactMode: false,
        showAdvancedFeatures: false,
        enableAnimations: true
    },
    security: {
        encryptionEnabled: true,
        sessionTimeout: 3600,
        enableAuditLog: true,
        enableEncryption: true,
        encryptionKey: ''
    },
    database: {
        type: 'qdrant',
        host: 'http://localhost:6333',
        collection: 'memories',
        dimensions: 1536
    },
    performance: {
        queryTimeout: 30,
        cacheSize: 100,
        batchSize: 50,
        enablePreloading: false
    }
}

const api = {
    async getConfig(): Promise<SystemConfig> {
        try {
            // Try real API first
            const response = await configApi.get();
            if (response.success && response.data) {
                // Transform API config to SystemConfig format
                return {
                    memory: {
                        maxMemories: response.data.settings.maxMemories,
                        retentionDays: response.data.settings.retentionDays,
                        enableEmbeddings: true, // Default for now
                        provider: 'openai', // Default for now
                        model: 'text-embedding-ada-002', // Default for now
                        enableCache: true
                    },
                    api: {
                        baseUrl: response.data.endpoints.api,
                        timeout: 30000,
                        retryAttempts: 3,
                        rateLimit: response.data.security.maxRequestsPerMinute
                    },
                    ui: {
                        theme: 'system',
                        compactMode: false,
                        showAdvancedFeatures: true,
                        enableAnimations: true
                    },
                    security: {
                        encryptionEnabled: false,
                        sessionTimeout: 3600,
                        enableAuditLog: true,
                        enableEncryption: false
                    },
                    database: {
                        type: 'memory',
                        host: 'localhost',
                        collection: 'memories',
                        dimensions: 1536
                    },
                    performance: {
                        queryTimeout: 10000,
                        cacheSize: 100,
                        batchSize: 50,
                        enablePreloading: false
                    }
                };
            }
        } catch (error) {
            console.warn('API config call failed, falling back to mock data:', error);
        }

        // Fallback to default config
        return defaultConfig;
    },

    async updateConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
        try {
            // For real API updates, we'd need to transform back to API format
            // For now, just return the merged config
            const currentConfig = await this.getConfig();
            return { ...currentConfig, ...updates };
        } catch (error) {
            console.warn('API config update failed, falling back to mock:', error);
            return { ...defaultConfig, ...updates };
        }
    },

    async resetConfig(): Promise<SystemConfig> {
        return defaultConfig;
    }
}

export const useConfigStore = create<ConfigState>()(
    devtools(
        persist(
            (set, _get) => ({
                config: null,
                isLoading: false,
                error: null,

                fetchConfig: async () => {
                    try {
                        set({ isLoading: true, error: null })
                        const config = await api.getConfig()
                        set({ config, isLoading: false })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to fetch configuration',
                            isLoading: false
                        })
                    }
                },

                updateConfig: async (updates) => {
                    try {
                        set({ isLoading: true, error: null })
                        const config = await api.updateConfig(updates)
                        set({ config, isLoading: false })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to update configuration',
                            isLoading: false
                        })
                    }
                }, resetConfig: async () => {
                    try {
                        set({ isLoading: true, error: null })
                        const config = await api.resetConfig()
                        set({ config, isLoading: false })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Failed to reset configuration',
                            isLoading: false
                        })
                    }
                },

                testConnection: async () => {
                    try {
                        set({ isLoading: true, error: null })
                        // Mock connection test
                        await new Promise(resolve => setTimeout(resolve, 1000))
                        const success = Math.random() > 0.3 // 70% success rate for demo
                        set({ isLoading: false })

                        if (success) {
                            return { success: true }
                        } else {
                            return { success: false, error: 'Connection timeout' }
                        }
                    } catch (error) {
                        set({ isLoading: false })
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Connection test failed'
                        }
                    }
                },

                clearError: () => set({ error: null })
            }),
            {
                name: 'config-store',
                partialize: (state) => ({ config: state.config })
            }
        ),
        { name: 'config-store' }
    )
)
