/**
 * Memory Tier System - Revolutionary Multi-Tier Memory Architecture
 * Provides 100% functionality with or without OpenAI
 */

export enum MemoryTierLevel {
    ADVANCED = 'advanced',     // OpenAI-powered semantic search
    SMART = 'smart',          // Local AI embeddings
    BASIC = 'basic',          // Keyword-based search
    MOCK = 'mock'             // Testing/development mode
}

export interface MemoryTierCapabilities {
    semanticSearch: boolean;
    embeddings: boolean;
    classification: boolean;
    vectorSimilarity: boolean;
    offline: boolean;
    performance: 'high' | 'medium' | 'low';
    accuracy: 'high' | 'medium' | 'low';
}

export interface MemoryTierConfig {
    level: MemoryTierLevel;
    capabilities: MemoryTierCapabilities;
    fallbackTier?: MemoryTierLevel;
    priority: number;
}

export interface MemoryTierInfo {
    currentTier: MemoryTierLevel;
    availableTiers: MemoryTierLevel[];
    capabilities: MemoryTierCapabilities;
    fallbackChain: MemoryTierLevel[];
    message: string;
}

export const MEMORY_TIER_CONFIGS: Record<MemoryTierLevel, MemoryTierConfig> = {
    [MemoryTierLevel.ADVANCED]: {
        level: MemoryTierLevel.ADVANCED,
        capabilities: {
            semanticSearch: true,
            embeddings: true,
            classification: true,
            vectorSimilarity: true,
            offline: false,
            performance: 'high',
            accuracy: 'high'
        },
        fallbackTier: MemoryTierLevel.SMART,
        priority: 1
    },
    [MemoryTierLevel.SMART]: {
        level: MemoryTierLevel.SMART,
        capabilities: {
            semanticSearch: true,
            embeddings: true,
            classification: true,
            vectorSimilarity: true,
            offline: true,
            performance: 'medium',
            accuracy: 'medium'
        },
        fallbackTier: MemoryTierLevel.BASIC,
        priority: 2
    },
    [MemoryTierLevel.BASIC]: {
        level: MemoryTierLevel.BASIC,
        capabilities: {
            semanticSearch: false,
            embeddings: false,
            classification: true,
            vectorSimilarity: false,
            offline: true,
            performance: 'medium',
            accuracy: 'low'
        },
        fallbackTier: MemoryTierLevel.MOCK,
        priority: 3
    },
    [MemoryTierLevel.MOCK]: {
        level: MemoryTierLevel.MOCK,
        capabilities: {
            semanticSearch: false,
            embeddings: false,
            classification: false,
            vectorSimilarity: false,
            offline: true,
            performance: 'high',
            accuracy: 'low'
        },
        priority: 4
    }
};

export class MemoryTierDetector {
    private static instance: MemoryTierDetector;

    public static getInstance(): MemoryTierDetector {
        if (!MemoryTierDetector.instance) {
            MemoryTierDetector.instance = new MemoryTierDetector();
        }
        return MemoryTierDetector.instance;
    }

    /**
     * Detect the best available memory tier based on environment
     */
    public async detectBestTier(): Promise<MemoryTierLevel> {
        // Check for OpenAI availability
        if (await this.isOpenAIAvailable()) {
            return MemoryTierLevel.ADVANCED;
        }

        // Check for local AI availability
        if (await this.isLocalAIAvailable()) {
            return MemoryTierLevel.SMART;
        }

        // Check if we're in testing environment
        if (this.isTestingEnvironment()) {
            return MemoryTierLevel.MOCK;
        }

        // Default to basic memory
        return MemoryTierLevel.BASIC;
    }

    /**
     * Get tier information for user feedback
     */
    public getTierInfo(currentTier: MemoryTierLevel): MemoryTierInfo {
        const config = MEMORY_TIER_CONFIGS[currentTier];
        const fallbackChain = this.buildFallbackChain(currentTier);

        return {
            currentTier,
            availableTiers: Object.values(MemoryTierLevel),
            capabilities: config.capabilities,
            fallbackChain,
            message: this.getTierMessage(currentTier)
        };
    }
    /**
     * Check if OpenAI (including Azure OpenAI) is available
     */
    private async isOpenAIAvailable(): Promise<boolean> {
        try {
            // Check for Azure OpenAI configuration
            const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
            const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
            const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

            if (azureEndpoint && azureApiKey && azureDeployment) {
                // Test Azure OpenAI availability with a minimal chat request
                const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
                const response = await fetch(`${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`, {
                    method: 'POST',
                    headers: {
                        'api-key': azureApiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: 'test' }],
                        max_tokens: 1
                    })
                });

                if (response.ok) return true;
            }

            // Check for standard OpenAI configuration
            const apiKey = process.env.MEMORAI_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
            if (!apiKey) return false;

            // Quick test call to validate API key
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Check if local AI is available
     */
    private async isLocalAIAvailable(): Promise<boolean> {
        try {
            // Check if Python and sentence-transformers are available
            const { spawn } = await import('child_process');

            return new Promise((resolve) => {
                const python = spawn('python', ['-c', 'import sentence_transformers; print("OK")']);

                python.on('close', (code) => {
                    resolve(code === 0);
                });

                python.on('error', () => {
                    resolve(false);
                });

                // Timeout after 5 seconds                setTimeout(() => resolve(false), 5000);
            });
        } catch {
            return false;
        }
    }

    /**
     * Check if we're in testing environment
     */
    private isTestingEnvironment(): boolean {
        return process.env.NODE_ENV === 'test' ||
            process.env.MEMORAI_MODE === 'test' ||
            process.env.JEST_WORKER_ID !== undefined;
    }

    /**
     * Build fallback chain for a tier
     */
    private buildFallbackChain(tier: MemoryTierLevel): MemoryTierLevel[] {
        const chain: MemoryTierLevel[] = [tier];
        let currentTier = tier;

        while (MEMORY_TIER_CONFIGS[currentTier].fallbackTier) {
            const nextTier = MEMORY_TIER_CONFIGS[currentTier].fallbackTier!;
            chain.push(nextTier);
            currentTier = nextTier;
        }

        return chain;
    }

    /**
     * Get user-friendly message for tier
     */
    private getTierMessage(tier: MemoryTierLevel): string {
        switch (tier) {
            case MemoryTierLevel.ADVANCED:
                return '🚀 Advanced Memory: Full semantic search with OpenAI embeddings';
            case MemoryTierLevel.SMART:
                return '🧠 Smart Memory: Local AI embeddings for offline semantic search';
            case MemoryTierLevel.BASIC:
                return '📝 Basic Memory: Keyword-based search, fully offline';
            case MemoryTierLevel.MOCK:
                return '🧪 Mock Memory: Testing mode with simulated responses';
            default:
                return '❓ Unknown Memory Tier';
        }
    }
}
