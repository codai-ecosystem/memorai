/**
 * Memory Tier System - Revolutionary Multi-Tier Memory Architecture
 * Provides 100% functionality with or without OpenAI
 */

import { logger } from '../utils/logger.js';

export enum MemoryTierLevel {
  ADVANCED = 'advanced', // OpenAI-powered semantic search
  SMART = 'smart', // Local AI embeddings
  BASIC = 'basic', // Keyword-based search
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
      accuracy: 'high',
    },
    fallbackTier: MemoryTierLevel.SMART,
    priority: 1,
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
      accuracy: 'medium',
    },
    fallbackTier: MemoryTierLevel.BASIC,
    priority: 2,
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
      accuracy: 'low',
    },
    priority: 3,
  },
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
    logger.debug('[MemoryTier] Starting tier detection...');

    // Check for forced tier override
    const forcedTier =
      process.env.MEMORAI_FORCE_TIER || process.env.MEMORAI_TIER;
    if (forcedTier) {
      logger.debug(
        '[MemoryTier] Found forced tier environment variable:',
        forcedTier
      );

      switch (forcedTier.toLowerCase()) {
        case 'advanced':
          logger.debug(
            '[MemoryTier] Forcing advanced tier via environment variable'
          );
          return MemoryTierLevel.ADVANCED;
        case 'smart':
          logger.debug(
            '[MemoryTier] Forcing smart tier via environment variable'
          );
          return MemoryTierLevel.SMART;
        case 'basic':
          logger.debug(
            '[MemoryTier] Forcing basic tier via environment variable'
          );
          return MemoryTierLevel.BASIC;
        default:
          logger.warn(
            '[MemoryTier] Invalid forced tier value, falling back to auto-detection'
          );
      }
    }

    logger.debug(
      '[MemoryTier] Auto-detecting tier based on available services...'
    );

    // Check for OpenAI availability
    logger.debug('[MemoryTier] Checking OpenAI availability...');
    if (await this.isOpenAIAvailable()) {
      logger.info('[MemoryTier] OpenAI is available - selecting ADVANCED tier');
      return MemoryTierLevel.ADVANCED;
    }

    // Check for local AI availability
    logger.debug('[MemoryTier] Checking local AI availability...');
    if (await this.isLocalAIAvailable()) {
      logger.info('[MemoryTier] Local AI is available - selecting SMART tier');
      return MemoryTierLevel.SMART;
    }

    // Default to basic memory
    logger.info(
      '[MemoryTier] No advanced services available - selecting BASIC tier'
    );
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
      message: this.getTierMessage(currentTier),
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

      logger.debug('[MemoryTier] Checking OpenAI availability...');
      logger.debug('[MemoryTier] Azure Endpoint:', azureEndpoint);
      logger.debug('[MemoryTier] Azure API Key present:', !!azureApiKey);
      logger.debug('[MemoryTier] Azure Deployment:', azureDeployment);

      if (azureEndpoint && azureApiKey && azureDeployment) {
        // Test Azure OpenAI availability with a minimal chat request
        const azureApiVersion =
          process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

        logger.debug('[MemoryTier] Testing Azure OpenAI connection...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
          const response = await fetch(
            `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`,
            {
              method: 'POST',
              headers: {
                'api-key': azureApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 1,
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          logger.debug(
            '[MemoryTier] Azure OpenAI response status:',
            response.status
          );

          if (response.ok) {
            logger.info(
              '[MemoryTier] Azure OpenAI is available - returning true'
            );
            return true;
          } else {
            logger.warn(
              '[MemoryTier] Azure OpenAI returned non-ok status:',
              response.status
            );
            const errorText = await response.text();
            logger.error('[MemoryTier] Azure OpenAI error:', errorText);
          }
        } catch (error) {
          clearTimeout(timeoutId);
          logger.error('[MemoryTier] Azure OpenAI test failed:', error);
        }
      }

      // Check for standard OpenAI configuration
      const apiKey =
        process.env.MEMORAI_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

      logger.debug('[MemoryTier] Standard OpenAI API Key present:', !!apiKey);

      if (!apiKey) {
        logger.debug('[MemoryTier] No OpenAI API key found - returning false');
        return false;
      }

      // Quick test call to validate API key
      logger.debug('[MemoryTier] Testing standard OpenAI connection...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        logger.debug(
          '[MemoryTier] Standard OpenAI response status:',
          response.status
        );
        const isOk = response.ok;
        logger.debug('[MemoryTier] Standard OpenAI result:', isOk);
        return isOk;
      } catch (error) {
        clearTimeout(timeoutId);
        logger.error('[MemoryTier] Standard OpenAI test failed:', error);
        return false;
      }
    } catch (error) {
      logger.error('[MemoryTier] isOpenAIAvailable caught error:', error);
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

      return new Promise(resolve => {
        const python = spawn('python', [
          '-c',
          'import sentence_transformers; print("OK")',
        ]);

        python.on('close', code => {
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
      default:
        return '❓ Unknown Memory Tier';
    }
  }
}
