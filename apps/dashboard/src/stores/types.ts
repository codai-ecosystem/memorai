
/**
 * Type definitions for the Memorai Dashboard
 * Shared types across stores and components
 */

// Memory types
export interface Memory {
    id: string;
    agentId: string;
    content: string;
    timestamp: string;
    metadata: {
        type?: string;
        importance?: number;
        tags?: string[];
        source?: string;
        similarity?: number;
        [key: string]: unknown;
    };
}

export interface MemorySearchResult extends Memory {
    score: number;
    relevance: number;
}

// Configuration types
export interface Config {
    id: string;
    name: string;
    description: string;
    version: string;
    tier: string;
    capabilities: string[];
    status: 'active' | 'inactive' | 'error';
    endpoints: {
        api: string;
        websocket: string;
    };
    settings: {
        maxMemories: number;
        defaultAgent: string;
        autoBackup: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        retentionDays: number;
    };
    security: {
        apiKeyRequired: boolean;
        corsEnabled: boolean;
        rateLimitEnabled: boolean;
        maxRequestsPerMinute: number;
    };
    features: {
        search: boolean;
        analytics: boolean;
        export: boolean;
        import: boolean;
        realtime: boolean;
    };
    lastUpdated: string;
}

// Store state types
export interface MemoryState {
    memories: Memory[];
    searchResults: Memory[];
    isLoading: boolean;
    error: string | null;
    searchQuery: string;
    selectedAgentId: string;
    totalCount: number;
    lastOperation: {
        type: 'create' | 'search' | 'delete' | 'export' | 'import' | null;
        timestamp: string;
        success: boolean;
        message?: string;
    } | null;
}

export interface ConfigState {
    config: Config | null;
    isLoading: boolean;
    error: string | null;
    isDirty: boolean;
    lastSaved: string | null;
}

// Action types
export interface MemoryActions {
    setMemories: (memories: Memory[]) => void;
    addMemory: (agentId: string, content: string, metadata?: Record<string, any>) => Promise<boolean>;
    searchMemories: (agentId: string, query: string, limit?: number) => Promise<boolean>;
    deleteMemory: (agentId: string, memoryId: string) => Promise<boolean>;
    setSearchResults: (results: Memory[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSearchQuery: (query: string) => void;
    setSelectedAgentId: (agentId: string) => void;
    exportMemories: (agentId: string) => Promise<Memory[] | null>;
    importMemories: (agentId: string, memories: Memory[]) => Promise<boolean>;
    clearError: () => void;
    reset: () => void;
}

export interface ConfigActions {
    loadConfig: () => Promise<boolean>;
    updateConfig: (updates: Partial<Config>) => Promise<boolean>;
    saveConfig: () => Promise<boolean>;
    resetConfig: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

// Component prop types
export interface DashboardComponentProps {
    className?: string;
}

export interface MemoryComponentProps extends DashboardComponentProps {
    agentId?: string;
}

export interface SearchComponentProps extends DashboardComponentProps {
    onSearch?: (query: string) => void;
    placeholder?: string;
}

// API response types
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    success: boolean;
}

// Statistics types
export interface StatsData {
    totalMemories: number;
    activeAgents: number;
    memoryOperations: number;
    recentActivity: Array<{
        type: string;
        timestamp: string;
        agent: string;
        content: string;
    }>;
    memoryDistribution: Array<{
        type: string;
        count: number;
    }>;
    performanceMetrics: {
        averageResponseTime: number;
        successRate: number;
        errorRate: number;
    };
}

// Event types for real-time updates
export interface MemoryEvent {
    type: 'memory:created' | 'memory:deleted' | 'memory:updated';
    agentId: string;
    memory: Memory;
    timestamp: string;
}

export interface SystemEvent {
    type: 'system:status' | 'system:error' | 'system:config';
    data: unknown;
    timestamp: string;
}

// Error types
export class MemoryError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'MemoryError';
    }
}

export class ConfigError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'ConfigError';
    }
}

// Utility types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Default values
export const DEFAULT_AGENT_ID = 'default-agent';
export const DEFAULT_SEARCH_LIMIT = 10;
export const DEFAULT_CONTEXT_SIZE = 5;

export const DEFAULT_CONFIG: Config = {
    id: 'memorai-dashboard',
    name: 'Memorai Dashboard',
    description: 'Advanced memory management dashboard',
    version: '2.0.0',
    tier: 'development',
    capabilities: ['memory', 'search', 'analytics'],
    status: 'active',
    endpoints: {
        api: 'http://localhost:6367/api',
        websocket: 'ws://localhost:6367/ws',
    },
    settings: {
        maxMemories: 10000,
        defaultAgent: DEFAULT_AGENT_ID,
        autoBackup: true,
        logLevel: 'info',
        retentionDays: 30,
    },
    security: {
        apiKeyRequired: false,
        corsEnabled: true,
        rateLimitEnabled: true,
        maxRequestsPerMinute: 100,
    },
    features: {
        search: true,
        analytics: true,
        export: true,
        import: true,
        realtime: true,
    },
    lastUpdated: new Date().toISOString(),
};
