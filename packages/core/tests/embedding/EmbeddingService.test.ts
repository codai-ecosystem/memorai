import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import OpenAI from 'openai';

import { EmbeddingService, OpenAIEmbeddingProvider, LocalEmbeddingProvider } from '../../src/embedding/EmbeddingService.js';
import { EmbeddingError, type MemoryConfig } from '../../src/types/index.js';

// Mock OpenAI
vi.mock('openai');
const MockedOpenAI = vi.mocked(OpenAI);

describe('EmbeddingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OpenAIEmbeddingProvider', () => {
    const mockConfig: MemoryConfig['embedding'] = {
      provider: 'openai',
      api_key: 'test-api-key',
      model: 'text-embedding-3-small',
      endpoint: 'https://api.openai.com/v1',
    };

    beforeEach(() => {
      MockedOpenAI.mockClear();
    });

    describe('constructor', () => {
      it('should create provider with valid config', () => {
        const provider = new OpenAIEmbeddingProvider(mockConfig);
        expect(provider).toBeDefined();
        expect(provider.getDimension()).toBe(1536);
      });

      it('should throw error when api_key is missing', () => {
        const invalidConfig = { ...mockConfig, api_key: '' };
        expect(() => new OpenAIEmbeddingProvider(invalidConfig)).toThrow(
          EmbeddingError
        );
        expect(() => new OpenAIEmbeddingProvider(invalidConfig)).toThrow(
          'OpenAI API key is required'
        );
      });

      it('should set custom endpoint if provided', () => {
        const configWithEndpoint = {
          ...mockConfig,
          endpoint: 'https://custom.openai.com/v1',
        };
        const provider = new OpenAIEmbeddingProvider(configWithEndpoint);
        expect(provider).toBeDefined();
      });

      it('should get correct dimensions for different models', () => {
        const smallProvider = new OpenAIEmbeddingProvider({
          ...mockConfig,
          model: 'text-embedding-3-small',
        });
        expect(smallProvider.getDimension()).toBe(1536);

        const largeProvider = new OpenAIEmbeddingProvider({
          ...mockConfig,
          model: 'text-embedding-3-large',
        });
        expect(largeProvider.getDimension()).toBe(3072);

        const adaProvider = new OpenAIEmbeddingProvider({
          ...mockConfig,
          model: 'text-embedding-ada-002',
        });
        expect(adaProvider.getDimension()).toBe(1536);

        const unknownProvider = new OpenAIEmbeddingProvider({
          ...mockConfig,
          model: 'unknown-model',
        });
        expect(unknownProvider.getDimension()).toBe(1536); // Default
      });
    });

    describe('embed', () => {
      let provider: OpenAIEmbeddingProvider;
      let mockEmbeddings: {
        create: MockedFunction<OpenAI['embeddings']['create']>;
      };

      beforeEach(() => {
        mockEmbeddings = {
          create: vi.fn(),
        };

        MockedOpenAI.mockImplementation(() => ({
          embeddings: mockEmbeddings,
        }) as any);

        provider = new OpenAIEmbeddingProvider(mockConfig);
      });

      it('should successfully embed text', async () => {
        const mockResponse = {
          data: [{ embedding: [0.1, 0.2, 0.3] }],
          usage: { total_tokens: 10 },
        };
        mockEmbeddings.create.mockResolvedValue(mockResponse as any);

        const result = await provider.embed('test text');

        expect(result).toEqual({
          embedding: [0.1, 0.2, 0.3],
          tokens: 10,
          model: 'text-embedding-3-small',
        });

        expect(mockEmbeddings.create).toHaveBeenCalledWith({
          model: 'text-embedding-3-small',
          input: 'test text',
          encoding_format: 'float',
        });
      });

      it('should replace newlines in text', async () => {
        const mockResponse = {
          data: [{ embedding: [0.1, 0.2, 0.3] }],
          usage: { total_tokens: 10 },
        };
        mockEmbeddings.create.mockResolvedValue(mockResponse as any);

        await provider.embed('test\ntext\nwith\nnewlines');

        expect(mockEmbeddings.create).toHaveBeenCalledWith({
          model: 'text-embedding-3-small',
          input: 'test text with newlines',
          encoding_format: 'float',
        });
      });

      it('should throw error when no embedding returned', async () => {
        const mockResponse = {
          data: [{}], // No embedding field
          usage: { total_tokens: 10 },
        };
        mockEmbeddings.create.mockResolvedValue(mockResponse as any);

        await expect(provider.embed('test')).rejects.toThrow(EmbeddingError);
        await expect(provider.embed('test')).rejects.toThrow(
          'No embedding returned from OpenAI'
        );
      });

      it('should handle OpenAI API errors', async () => {
        const apiError = new Error('API rate limit exceeded');
        mockEmbeddings.create.mockRejectedValue(apiError);

        await expect(provider.embed('test')).rejects.toThrow(EmbeddingError);
        await expect(provider.embed('test')).rejects.toThrow(
          'OpenAI embedding failed: API rate limit exceeded'
        );
      });

      it('should handle unknown errors', async () => {
        mockEmbeddings.create.mockRejectedValue('string error');

        await expect(provider.embed('test')).rejects.toThrow(EmbeddingError);
        await expect(provider.embed('test')).rejects.toThrow(
          'Unknown embedding error'
        );
      });
    });

    describe('embedBatch', () => {
      let provider: OpenAIEmbeddingProvider;
      let mockEmbeddings: {
        create: MockedFunction<OpenAI['embeddings']['create']>;
      };

      beforeEach(() => {
        mockEmbeddings = {
          create: vi.fn(),
        };

        MockedOpenAI.mockImplementation(() => ({
          embeddings: mockEmbeddings,
        }) as any);

        provider = new OpenAIEmbeddingProvider(mockConfig);
      });

      it('should successfully embed batch of texts', async () => {
        const mockResponse = {
          data: [
            { embedding: [0.1, 0.2, 0.3] },
            { embedding: [0.4, 0.5, 0.6] },
          ],
          usage: { total_tokens: 20 },
        };
        mockEmbeddings.create.mockResolvedValue(mockResponse as any);

        const result = await provider.embedBatch(['text1', 'text2']);

        expect(result).toEqual([
          {
            embedding: [0.1, 0.2, 0.3],
            tokens: 10, // 20 / 2
            model: 'text-embedding-3-small',
          },
          {
            embedding: [0.4, 0.5, 0.6],
            tokens: 10, // 20 / 2
            model: 'text-embedding-3-small',
          },
        ]);

        expect(mockEmbeddings.create).toHaveBeenCalledWith({
          model: 'text-embedding-3-small',
          input: ['text1', 'text2'],
          encoding_format: 'float',
        });
      });

      it('should clean newlines from batch texts', async () => {
        const mockResponse = {
          data: [{ embedding: [0.1, 0.2, 0.3] }],
          usage: { total_tokens: 10 },
        };
        mockEmbeddings.create.mockResolvedValue(mockResponse as any);

        await provider.embedBatch(['text\nwith\nnewlines']);

        expect(mockEmbeddings.create).toHaveBeenCalledWith({
          model: 'text-embedding-3-small',
          input: ['text with newlines'],
          encoding_format: 'float',
        });
      });

      it('should handle batch API errors', async () => {
        const apiError = new Error('Batch processing failed');
        mockEmbeddings.create.mockRejectedValue(apiError);

        await expect(provider.embedBatch(['text1', 'text2'])).rejects.toThrow(
          EmbeddingError
        );
        await expect(provider.embedBatch(['text1', 'text2'])).rejects.toThrow(
          'OpenAI batch embedding failed: Batch processing failed'
        );
      });

      it('should handle unknown batch errors', async () => {
        mockEmbeddings.create.mockRejectedValue(123);

        await expect(provider.embedBatch(['text1', 'text2'])).rejects.toThrow(
          EmbeddingError
        );
        await expect(provider.embedBatch(['text1', 'text2'])).rejects.toThrow(
          'Unknown batch embedding error'
        );
      });
    });
  });

  describe('LocalEmbeddingProvider', () => {
    let provider: LocalEmbeddingProvider;

    beforeEach(() => {
      provider = new LocalEmbeddingProvider();
    });

    describe('constructor', () => {
      it('should create provider with default dimension', () => {
        expect(provider.getDimension()).toBe(1536);
      });

      it('should create provider with custom dimension', () => {
        const customProvider = new LocalEmbeddingProvider(512);
        expect(customProvider.getDimension()).toBe(512);
      });
    });

    describe('embed', () => {
      it('should generate embedding for text', async () => {
        const result = await provider.embed('test text');

        expect(result.embedding).toHaveLength(1536);
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.model).toBe('local-hash');
        expect(typeof result.tokens).toBe('number');
      });

      it('should generate consistent embeddings for same text', async () => {
        const result1 = await provider.embed('test text');
        const result2 = await provider.embed('test text');

        expect(result1.embedding).toEqual(result2.embedding);
        expect(result1.tokens).toEqual(result2.tokens);
      });

      it('should generate different embeddings for different text', async () => {
        const result1 = await provider.embed('text one');
        const result2 = await provider.embed('text two');

        expect(result1.embedding).not.toEqual(result2.embedding);
      });

      it('should generate normalized vectors', async () => {
        const result = await provider.embed('test text');
        
        // Check vector is normalized (magnitude should be close to 1)
        const magnitude = Math.sqrt(
          result.embedding.reduce((sum, val) => sum + val * val, 0)
        );
        expect(magnitude).toBeCloseTo(1, 5);
      });

      it('should calculate tokens based on text length', async () => {
        const shortResult = await provider.embed('hi');
        const longResult = await provider.embed('this is a much longer text');

        expect(longResult.tokens).toBeGreaterThan(shortResult.tokens);
      });
    });

    describe('embedBatch', () => {
      it('should embed batch of texts', async () => {
        const results = await provider.embedBatch(['text1', 'text2']);

        expect(results).toHaveLength(2);
        expect(results[0].embedding).toHaveLength(1536);
        expect(results[1].embedding).toHaveLength(1536);
        expect(results[0].model).toBe('local-hash');
        expect(results[1].model).toBe('local-hash');
      });

      it('should handle empty batch', async () => {
        const results = await provider.embedBatch([]);
        expect(results).toEqual([]);
      });
    });
  });

  describe('EmbeddingService', () => {
    describe('constructor', () => {
      it('should create service with OpenAI provider', () => {
        const config: MemoryConfig['embedding'] = {
          provider: 'openai',
          api_key: 'test-key',
          model: 'text-embedding-3-small',
        };
        
        const service = new EmbeddingService(config);
        expect(service).toBeDefined();
        expect(service.getDimension()).toBe(1536);
      });

      it('should create service with Azure provider', () => {
        const config: MemoryConfig['embedding'] = {
          provider: 'azure',
          api_key: 'test-key',
          model: 'text-embedding-3-small',
        };
        
        const service = new EmbeddingService(config);
        expect(service).toBeDefined();
      });

      it('should create service with Azure provider and custom endpoint', () => {
        const config: MemoryConfig['embedding'] = {
          provider: 'azure',
          api_key: 'test-key',
          model: 'text-embedding-3-small',
          endpoint: 'https://custom.azure.com',
        };
        
        const service = new EmbeddingService(config);
        expect(service).toBeDefined();
      });

      it('should create service with local provider', () => {
        const config: MemoryConfig['embedding'] = {
          provider: 'local',
          api_key: '',
          model: 'local',
        };
        
        const service = new EmbeddingService(config);
        expect(service).toBeDefined();
        expect(service.getDimension()).toBe(1536);
      });

      it('should throw error for unsupported provider', () => {
        const config: MemoryConfig['embedding'] = {
          provider: 'unsupported' as any,
          api_key: 'test-key',
          model: 'test-model',
        };
        
        expect(() => new EmbeddingService(config)).toThrow(EmbeddingError);
        expect(() => new EmbeddingService(config)).toThrow(
          'Unsupported embedding provider: unsupported'
        );
      });
    });

    describe('embed', () => {
      let service: EmbeddingService;

      beforeEach(() => {
        const config: MemoryConfig['embedding'] = {
          provider: 'local',
          api_key: '',
          model: 'local',
        };
        service = new EmbeddingService(config);
      });

      it('should embed valid text', async () => {
        const result = await service.embed('test text');

        expect(result.embedding).toHaveLength(1536);
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.model).toBe('local-hash');
      });

      it('should trim whitespace from text', async () => {
        const result = await service.embed('  test text  ');
        expect(result).toBeDefined();
      });

      it('should throw error for empty text', async () => {
        await expect(service.embed('')).rejects.toThrow(EmbeddingError);
        await expect(service.embed('')).rejects.toThrow(
          'Text cannot be empty'
        );
      });

      it('should throw error for whitespace-only text', async () => {
        await expect(service.embed('   ')).rejects.toThrow(EmbeddingError);
        await expect(service.embed('   ')).rejects.toThrow(
          'Text cannot be empty'
        );
      });
    });

    describe('embedBatch', () => {
      let service: EmbeddingService;

      beforeEach(() => {
        const config: MemoryConfig['embedding'] = {
          provider: 'local',
          api_key: '',
          model: 'local',
        };
        service = new EmbeddingService(config);
      });

      it('should embed batch of texts', async () => {
        const results = await service.embedBatch(['text1', 'text2']);

        expect(results).toHaveLength(2);
        expect(results[0].embedding).toHaveLength(1536);
        expect(results[1].embedding).toHaveLength(1536);
      });

      it('should return empty array for empty batch', async () => {
        const results = await service.embedBatch([]);
        expect(results).toEqual([]);
      });

      it('should filter out empty texts', async () => {
        const results = await service.embedBatch(['text1', '', '  ', 'text2']);
        expect(results).toHaveLength(2);
      });

      it('should throw error when no valid texts provided', async () => {
        await expect(service.embedBatch(['', '  '])).rejects.toThrow(
          EmbeddingError
        );
        await expect(service.embedBatch(['', '  '])).rejects.toThrow(
          'No valid texts provided'
        );
      });

      it('should trim whitespace from valid texts', async () => {
        const results = await service.embedBatch(['  text1  ', '  text2  ']);
        expect(results).toHaveLength(2);
      });
    });

    describe('embedWithRetry', () => {
      it('should successfully embed on first attempt', async () => {
        const config: MemoryConfig['embedding'] = {
          provider: 'local',
          api_key: '',
          model: 'local',
        };
        const service = new EmbeddingService(config);

        const result = await service.embedWithRetry('test text');
        expect(result.embedding).toHaveLength(1536);
      });

      it('should retry on failure and eventually succeed', async () => {
        // Create a mock provider that fails first few times
        const mockProvider = {
          embed: vi.fn(),
          embedBatch: vi.fn(),
          getDimension: () => 1536,
        };

        const service = new EmbeddingService({
          provider: 'local',
          api_key: '',
          model: 'local',
        });
        
        // Replace the provider with our mock
        (service as any).provider = mockProvider;

        // Fail first two attempts, succeed on third
        mockProvider.embed
          .mockRejectedValueOnce(new Error('First failure'))
          .mockRejectedValueOnce(new Error('Second failure'))
          .mockResolvedValueOnce({
            embedding: [0.1, 0.2, 0.3],
            tokens: 5,
            model: 'test',
          });

        const result = await service.embedWithRetry('test text', 3, 10);
        expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
        expect(mockProvider.embed).toHaveBeenCalledTimes(3);
      });      it('should fail after max retries exceeded', async () => {
        const mockProvider = {
          embed: vi.fn(),
          embedBatch: vi.fn(),
          getDimension: () => 1536,
        };

        const service = new EmbeddingService({
          provider: 'local',
          api_key: '',
          model: 'local',
        });
        
        // Replace the provider with our mock
        (service as any).provider = mockProvider;

        // Always fail
        mockProvider.embed.mockRejectedValue(new Error('Always fails'));

        await expect(
          service.embedWithRetry('test text', 2, 10)
        ).rejects.toThrow(EmbeddingError);
        
        await expect(
          service.embedWithRetry('test text', 2, 10)
        ).rejects.toThrow('Failed to embed after 2 attempts');

        // Called twice for each call (2 calls × 2 retries each = 4 total)
        expect(mockProvider.embed).toHaveBeenCalledTimes(4);
      });

      it('should handle non-Error exceptions during retry', async () => {
        const mockProvider = {
          embed: vi.fn(),
          embedBatch: vi.fn(),
          getDimension: () => 1536,
        };

        const service = new EmbeddingService({
          provider: 'local',
          api_key: '',
          model: 'local',
        });
        
        // Replace the provider with our mock
        (service as any).provider = mockProvider;

        // Throw non-Error exception
        mockProvider.embed.mockRejectedValue('string error');

        await expect(
          service.embedWithRetry('test text', 1, 10)
        ).rejects.toThrow(EmbeddingError);
        
        await expect(
          service.embedWithRetry('test text', 1, 10)
        ).rejects.toThrow('Failed to embed after 1 attempts: Unknown error');
      });
    });
  });
});
