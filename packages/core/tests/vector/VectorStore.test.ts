import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemoryMetadata, MemoryQuery } from '../../src/types/index.js';
import { VectorStoreError } from '../../src/types/index.js';
import {
  MemoryVectorStore,
  QdrantVectorStore,
  type SearchResult,
  type VectorPoint,
} from '../../src/vector/VectorStore.js';

// Mock QdrantClient
vi.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: vi.fn(() => ({
    getCollections: vi.fn(),
    createCollection: vi.fn(),
    createPayloadIndex: vi.fn(),
    upsert: vi.fn(),
    search: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  })),
}));

// Helper function to create valid MemoryQuery objects
const createMemoryQuery = (
  overrides: Partial<MemoryQuery> = {}
): MemoryQuery => ({
  query: 'test query',
  tenant_id: 'tenant-1',
  limit: 10,
  threshold: 0.7,
  include_context: true,
  time_decay: true,
  ...overrides,
});

describe('VectorStore', () => {
  let mockQdrantClient: any;
  let qdrantStore: QdrantVectorStore;
  let memoryStore: MemoryVectorStore;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a mock Qdrant client
    mockQdrantClient = {
      getCollections: vi.fn(),
      createCollection: vi.fn(),
      createPayloadIndex: vi.fn(),
      upsert: vi.fn(),
      search: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    };

    // Mock the QdrantClient constructor to return our mock
    const { QdrantClient } = await import('@qdrant/js-client-rest');
    vi.mocked(QdrantClient as any).mockImplementation(() => mockQdrantClient);

    qdrantStore = new QdrantVectorStore(
      'http://localhost:6333',
      'test-collection',
      1536,
      'test-key'
    );
    memoryStore = new MemoryVectorStore(qdrantStore);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('QdrantVectorStore', () => {
    describe('constructor', () => {
      it('should create instance with API key', () => {
        const store = new QdrantVectorStore(
          'http://localhost:6333',
          'test',
          1536,
          'api-key'
        );
        expect(store).toBeInstanceOf(QdrantVectorStore);
      });

      it('should create instance without API key', () => {
        const store = new QdrantVectorStore(
          'http://localhost:6333',
          'test',
          1536
        );
        expect(store).toBeInstanceOf(QdrantVectorStore);
      });
    });

    describe('initialize', () => {
      it('should initialize successfully when collection does not exist', async () => {
        mockQdrantClient.getCollections.mockResolvedValue({
          collections: [],
        });
        mockQdrantClient.createCollection.mockResolvedValue({});
        mockQdrantClient.createPayloadIndex.mockResolvedValue({});

        await qdrantStore.initialize();

        expect(mockQdrantClient.getCollections).toHaveBeenCalledOnce();
        expect(mockQdrantClient.createCollection).toHaveBeenCalledWith(
          'test-collection',
          {
            vectors: {
              size: 1536,
              distance: 'Cosine',
            },
            optimizers_config: {
              default_segment_number: 2,
              max_segment_size: 20000,
              memmap_threshold: 50000,
              indexing_threshold: 20000,
              flush_interval_sec: 5,
            },
            hnsw_config: {
              m: 16,
              ef_construct: 100,
              full_scan_threshold: 10000,
            },
          }
        );
        expect(mockQdrantClient.createPayloadIndex).toHaveBeenCalledTimes(3);
      });

      it('should skip creation when collection already exists', async () => {
        mockQdrantClient.getCollections.mockResolvedValue({
          collections: [{ name: 'test-collection' }],
        });

        await qdrantStore.initialize();

        expect(mockQdrantClient.getCollections).toHaveBeenCalledOnce();
        expect(mockQdrantClient.createCollection).not.toHaveBeenCalled();
        expect(mockQdrantClient.createPayloadIndex).not.toHaveBeenCalled();
      });

      it('should throw VectorStoreError on initialization failure', async () => {
        const error = new Error('Connection failed');
        mockQdrantClient.getCollections.mockRejectedValue(error);

        await expect(qdrantStore.initialize()).rejects.toThrow(
          VectorStoreError
        );
        await expect(qdrantStore.initialize()).rejects.toThrow(
          'Failed to initialize Qdrant collection: Connection failed'
        );
      });

      it('should handle unknown error types', async () => {
        mockQdrantClient.getCollections.mockRejectedValue('Unknown error');

        await expect(qdrantStore.initialize()).rejects.toThrow(
          VectorStoreError
        );
        await expect(qdrantStore.initialize()).rejects.toThrow(
          'Unknown initialization error'
        );
      });
    });

    describe('upsert', () => {
      it('should upsert points successfully', async () => {
        const points: VectorPoint[] = [
          {
            id: 'test-1',
            vector: [0.1, 0.2, 0.3],
            payload: { content: 'test content' },
          },
        ];

        mockQdrantClient.upsert.mockResolvedValue({});

        await qdrantStore.upsert(points);

        expect(mockQdrantClient.upsert).toHaveBeenCalledWith(
          'test-collection',
          {
            wait: true,
            points: [
              {
                id: expect.stringMatching(
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                ),
                vector: [0.1, 0.2, 0.3],
                payload: {
                  content: 'test content',
                  original_id: 'test-1',
                },
              },
            ],
          }
        );
      });

      it('should handle empty points array', async () => {
        await qdrantStore.upsert([]);
        expect(mockQdrantClient.upsert).not.toHaveBeenCalled();
      });

      it('should throw VectorStoreError on upsert failure', async () => {
        const points: VectorPoint[] = [
          { id: 'test-1', vector: [0.1, 0.2], payload: {} },
        ];
        const error = new Error('Upsert failed');
        mockQdrantClient.upsert.mockRejectedValue(error);

        await expect(qdrantStore.upsert(points)).rejects.toThrow(
          VectorStoreError
        );
        await expect(qdrantStore.upsert(points)).rejects.toThrow(
          'Failed to upsert points: Upsert failed'
        );
      });

      it('should handle unknown error types in upsert', async () => {
        const points: VectorPoint[] = [
          { id: 'test-1', vector: [0.1, 0.2], payload: {} },
        ];
        mockQdrantClient.upsert.mockRejectedValue('Unknown error');

        await expect(qdrantStore.upsert(points)).rejects.toThrow(
          VectorStoreError
        );
        await expect(qdrantStore.upsert(points)).rejects.toThrow(
          'Unknown upsert error'
        );
      });
    });

    describe('search', () => {
      it('should search with basic query', async () => {
        const query: MemoryQuery = {
          query: 'test query',
          tenant_id: 'tenant-1',
          limit: 10,
          threshold: 0.7,
          include_context: true,
          time_decay: true,
        };

        const mockSearchResult = [
          {
            id: 'result-1',
            score: 0.9,
            payload: { content: 'test content', tenant_id: 'tenant-1' },
          },
        ];

        mockQdrantClient.search.mockResolvedValue(mockSearchResult);

        const results = await qdrantStore.search([0.1, 0.2, 0.3], query);

        expect(mockQdrantClient.search).toHaveBeenCalledWith(
          'test-collection',
          {
            vector: [0.1, 0.2, 0.3],
            filter: {
              must: [
                {
                  key: 'tenant_id',
                  match: { value: 'tenant-1' },
                },
              ],
            },
            limit: 10,
            score_threshold: 0.7,
            with_payload: true,
          }
        );

        expect(results).toEqual([
          {
            id: 'result-1',
            score: 0.9,
            payload: { content: 'test content', tenant_id: 'tenant-1' },
          },
        ]);
      });
      it('should search with type filter', async () => {
        const query = createMemoryQuery({ type: 'fact' });

        mockQdrantClient.search.mockResolvedValue([]);

        await qdrantStore.search([0.1, 0.2, 0.3], query);

        expect(mockQdrantClient.search).toHaveBeenCalledWith(
          'test-collection',
          {
            vector: [0.1, 0.2, 0.3],
            filter: {
              must: [
                {
                  key: 'tenant_id',
                  match: { value: 'tenant-1' },
                },
                {
                  key: 'type',
                  match: { value: 'fact' },
                },
              ],
            },
            limit: 10,
            score_threshold: 0.7,
            with_payload: true,
          }
        );
      });

      it('should search with agent_id filter', async () => {
        const query: MemoryQuery = {
          query: 'test query',
          tenant_id: 'tenant-1',
          agent_id: 'agent-1',
          limit: 10,
          threshold: 0.7,
          include_context: false,
          time_decay: false,
        };

        mockQdrantClient.search.mockResolvedValue([]);

        await qdrantStore.search([0.1, 0.2, 0.3], query);

        expect(mockQdrantClient.search).toHaveBeenCalledWith(
          'test-collection',
          {
            vector: [0.1, 0.2, 0.3],
            filter: {
              must: [
                {
                  key: 'tenant_id',
                  match: { value: 'tenant-1' },
                },
                {
                  key: 'agent_id',
                  match: { value: 'agent-1' },
                },
              ],
            },
            limit: 10,
            score_threshold: 0.7,
            with_payload: true,
          }
        );
      });

      it('should handle search results without payload', async () => {
        const query: MemoryQuery = {
          query: 'test query',
          tenant_id: 'tenant-1',
          limit: 10,
          threshold: 0.7,
          include_context: false,
          time_decay: false,
        };

        const mockSearchResult = [
          {
            id: 'result-1',
            score: 0.9,
            payload: null, // No payload
          },
        ];

        mockQdrantClient.search.mockResolvedValue(mockSearchResult);

        const results = await qdrantStore.search([0.1, 0.2, 0.3], query);

        expect(results).toEqual([
          {
            id: 'result-1',
            score: 0.9,
            payload: {},
          },
        ]);
      });

      it('should throw VectorStoreError on search failure', async () => {
        const query: MemoryQuery = {
          query: 'test query',
          tenant_id: 'tenant-1',
          limit: 10,
          threshold: 0.7,
          include_context: false,
          time_decay: false,
        };
        const error = new Error('Search failed');
        mockQdrantClient.search.mockRejectedValue(error);

        await expect(qdrantStore.search([0.1, 0.2], query)).rejects.toThrow(
          VectorStoreError
        );
        await expect(qdrantStore.search([0.1, 0.2], query)).rejects.toThrow(
          'Search failed: Search failed'
        );
      });

      it('should handle unknown error types in search', async () => {
        const query: MemoryQuery = {
          query: 'test query',
          tenant_id: 'tenant-1',
          limit: 10,
          threshold: 0.7,
          include_context: false,
          time_decay: false,
        };
        mockQdrantClient.search.mockRejectedValue('Unknown error');

        await expect(qdrantStore.search([0.1, 0.2], query)).rejects.toThrow(
          VectorStoreError
        );
        await expect(qdrantStore.search([0.1, 0.2], query)).rejects.toThrow(
          'Unknown search error'
        );
      });
    });

    describe('delete', () => {
      it('should delete points successfully', async () => {
        const ids = ['id-1', 'id-2'];
        mockQdrantClient.delete.mockResolvedValue({});

        await qdrantStore.delete(ids);

        expect(mockQdrantClient.delete).toHaveBeenCalledWith(
          'test-collection',
          {
            wait: true,
            points: ids,
          }
        );
      });

      it('should handle empty ids array', async () => {
        await qdrantStore.delete([]);
        expect(mockQdrantClient.delete).not.toHaveBeenCalled();
      });

      it('should throw VectorStoreError on delete failure', async () => {
        const ids = ['id-1'];
        const error = new Error('Delete failed');
        mockQdrantClient.delete.mockRejectedValue(error);

        await expect(qdrantStore.delete(ids)).rejects.toThrow(VectorStoreError);
        await expect(qdrantStore.delete(ids)).rejects.toThrow(
          'Failed to delete points: Delete failed'
        );
      });

      it('should handle unknown error types in delete', async () => {
        const ids = ['id-1'];
        mockQdrantClient.delete.mockRejectedValue('Unknown error');

        await expect(qdrantStore.delete(ids)).rejects.toThrow(VectorStoreError);
        await expect(qdrantStore.delete(ids)).rejects.toThrow(
          'Unknown delete error'
        );
      });
    });

    describe('count', () => {
      it('should count points successfully', async () => {
        mockQdrantClient.count.mockResolvedValue({ count: 42 });

        const count = await qdrantStore.count('tenant-1');

        expect(mockQdrantClient.count).toHaveBeenCalledWith('test-collection', {
          filter: {
            must: [
              {
                key: 'tenant_id',
                match: { value: 'tenant-1' },
              },
            ],
          },
        });
        expect(count).toBe(42);
      });

      it('should throw VectorStoreError on count failure', async () => {
        const error = new Error('Count failed');
        mockQdrantClient.count.mockRejectedValue(error);

        await expect(qdrantStore.count('tenant-1')).rejects.toThrow(
          VectorStoreError
        );
        await expect(qdrantStore.count('tenant-1')).rejects.toThrow(
          'Failed to count points: Count failed'
        );
      });

      it('should handle unknown error types in count', async () => {
        mockQdrantClient.count.mockRejectedValue('Unknown error');

        await expect(qdrantStore.count('tenant-1')).rejects.toThrow(
          VectorStoreError
        );
        await expect(qdrantStore.count('tenant-1')).rejects.toThrow(
          'Unknown count error'
        );
      });
    });

    describe('healthCheck', () => {
      it('should return true when collection exists', async () => {
        mockQdrantClient.getCollections.mockResolvedValue({
          collections: [
            { name: 'test-collection' },
            { name: 'other-collection' },
          ],
        });

        const result = await qdrantStore.healthCheck();

        expect(result).toBe(true);
        expect(mockQdrantClient.getCollections).toHaveBeenCalledOnce();
      });

      it('should return false when collection does not exist', async () => {
        mockQdrantClient.getCollections.mockResolvedValue({
          collections: [{ name: 'other-collection' }],
        });

        const result = await qdrantStore.healthCheck();

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        mockQdrantClient.getCollections.mockRejectedValue(
          new Error('Connection failed')
        );

        const result = await qdrantStore.healthCheck();

        expect(result).toBe(false);
      });
    });
  });

  describe('MemoryVectorStore', () => {
    let mockStore: any;
    let memoryVectorStore: MemoryVectorStore;

    beforeEach(() => {
      mockStore = {
        initialize: vi.fn(),
        upsert: vi.fn(),
        search: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        healthCheck: vi.fn(),
        close: vi.fn(),
      };
      memoryVectorStore = new MemoryVectorStore(mockStore);
    });

    describe('initialize', () => {
      it('should initialize the underlying store', async () => {
        mockStore.initialize.mockResolvedValue(undefined);

        await memoryVectorStore.initialize();

        expect(mockStore.initialize).toHaveBeenCalledOnce();
      });

      it('should only initialize once', async () => {
        mockStore.initialize.mockResolvedValue(undefined);

        await memoryVectorStore.initialize();
        await memoryVectorStore.initialize();

        expect(mockStore.initialize).toHaveBeenCalledOnce();
      });
    });

    describe('storeMemory', () => {
      const mockMemory: MemoryMetadata = {
        id: 'mem-1',
        type: 'fact',
        content: 'Test memory content',
        confidence: 0.9,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastAccessedAt: new Date('2024-01-01'),
        accessCount: 1,
        importance: 0.8,
        emotional_weight: 0.1,
        tags: ['test'],
        tenant_id: 'tenant-1',
        agent_id: 'agent-1',
        ttl: new Date('2025-01-01'),
      };

      it('should store memory successfully', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.upsert.mockResolvedValue(undefined);

        const embedding = [0.1, 0.2, 0.3];

        await memoryVectorStore.storeMemory(mockMemory, embedding);

        expect(mockStore.initialize).toHaveBeenCalledOnce();
        expect(mockStore.upsert).toHaveBeenCalledWith([
          {
            id: 'mem-1',
            vector: embedding,
            payload: {
              created_at: '2024-01-01T00:00:00.000Z',
              type: 'fact',
              tenant_id: 'tenant-1',
            },
          },
        ]);
      });

      it('should handle memory without TTL', async () => {
        const memoryWithoutTTL = { ...mockMemory, ttl: undefined };
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.upsert.mockResolvedValue(undefined);

        await memoryVectorStore.storeMemory(memoryWithoutTTL, [0.1, 0.2]);

        expect(mockStore.upsert).toHaveBeenCalledWith([
          {
            id: 'mem-1',
            vector: [0.1, 0.2],
            payload: {
              created_at: '2024-01-01T00:00:00.000Z',
              type: 'fact',
              tenant_id: 'tenant-1',
            },
          },
        ]);
      });
    });

    describe('storeMemories', () => {
      const mockMemories: MemoryMetadata[] = [
        {
          id: 'mem-1',
          type: 'fact',
          content: 'First memory',
          confidence: 0.9,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          lastAccessedAt: new Date('2024-01-01'),
          accessCount: 1,
          importance: 0.8,
          tags: [],
          tenant_id: 'tenant-1',
        },
        {
          id: 'mem-2',
          type: 'personality',
          content: 'Second memory',
          confidence: 0.8,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          lastAccessedAt: new Date('2024-01-02'),
          accessCount: 2,
          importance: 0.7,
          tags: ['test'],
          tenant_id: 'tenant-1',
        },
      ];

      it('should store multiple memories successfully', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.upsert.mockResolvedValue(undefined);

        const embeddings = [
          [0.1, 0.2],
          [0.3, 0.4],
        ];

        await memoryVectorStore.storeMemories(mockMemories, embeddings);

        expect(mockStore.initialize).toHaveBeenCalledOnce();
        expect(mockStore.upsert).toHaveBeenCalledWith([
          {
            id: 'mem-1',
            vector: [0.1, 0.2],
            payload: {
              created_at: '2024-01-01T00:00:00.000Z',
              type: 'fact',
              tenant_id: 'tenant-1',
            },
          },
          {
            id: 'mem-2',
            vector: [0.3, 0.4],
            payload: {
              created_at: '2024-01-02T00:00:00.000Z',
              type: 'personality',
              tenant_id: 'tenant-1',
            },
          },
        ]);
      });

      it('should throw error on memories/embeddings count mismatch', async () => {
        const embeddings = [[0.1, 0.2]]; // Only one embedding for two memories

        await expect(
          memoryVectorStore.storeMemories(mockMemories, embeddings)
        ).rejects.toThrow(VectorStoreError);
        await expect(
          memoryVectorStore.storeMemories(mockMemories, embeddings)
        ).rejects.toThrow('Memories and embeddings count mismatch');
      });
    });

    describe('searchMemories', () => {
      const mockQuery: MemoryQuery = {
        query: 'test search',
        tenant_id: 'tenant-1',
        limit: 10,
        threshold: 0.7,
        include_context: false,
        time_decay: false,
      };

      it('should search memories and transform results', async () => {
        mockStore.initialize.mockResolvedValue(undefined);

        const mockSearchResults: SearchResult[] = [
          {
            id: 'result-1',
            score: 0.95,
            payload: {
              id: 'mem-1',
              type: 'fact',
              content: 'Test content',
              confidence: 0.9,
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z',
              last_accessed_at: '2024-01-01T00:00:00.000Z',
              accessCount: 1,
              importance: 0.8,
              emotional_weight: 0.1,
              tags: ['test'],
              tenant_id: 'tenant-1',
              agent_id: 'agent-1',
              ttl: '2025-01-01T00:00:00.000Z',
            },
          },
        ];

        mockStore.search.mockResolvedValue(mockSearchResults);

        const embedding = [0.1, 0.2, 0.3];
        const results = await memoryVectorStore.searchMemories(
          embedding,
          mockQuery
        );

        expect(mockStore.initialize).toHaveBeenCalledOnce();
        expect(mockStore.search).toHaveBeenCalledWith(embedding, mockQuery);

        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({
          memory: {
            id: 'mem-1',
            type: 'fact',
            content: 'Test content',
            confidence: 0.9,
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            updatedAt: new Date('2024-01-01T00:00:00.000Z'),
            lastAccessedAt: new Date('2024-01-01T00:00:00.000Z'),
            accessCount: 1,
            importance: 0.8,
            emotional_weight: 0.1,
            tags: ['test'],
            tenant_id: 'tenant-1',
            agent_id: 'agent-1',
            ttl: new Date('2025-01-01T00:00:00.000Z'),
          },
          score: 0.95,
          relevance_reason:
            'Highly relevant to "test search" with excellent semantic match',
        });
      });

      it('should handle results without TTL', async () => {
        mockStore.initialize.mockResolvedValue(undefined);

        const mockSearchResults: SearchResult[] = [
          {
            id: 'result-1',
            score: 0.8,
            payload: {
              id: 'mem-1',
              type: 'fact',
              content: 'Test content',
              confidence: 0.9,
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z',
              last_accessed_at: '2024-01-01T00:00:00.000Z',
              accessCount: 1,
              importance: 0.8,
              tags: [],
              tenant_id: 'tenant-1',
              ttl: null,
            },
          },
        ];

        mockStore.search.mockResolvedValue(mockSearchResults);

        const results = await memoryVectorStore.searchMemories(
          [0.1, 0.2],
          mockQuery
        );

        expect(results[0].memory.ttl).toBeUndefined();
        expect(results[0].memory.emotional_weight).toBeUndefined();
        expect(results[0].memory.agent_id).toBeUndefined();
        expect(results[0].relevance_reason).toBe(
          'Strong relevance to "test search" with good semantic similarity'
        );
      });
    });

    describe('deleteMemories', () => {
      it('should delete memories', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.delete.mockResolvedValue(undefined);

        const ids = ['mem-1', 'mem-2'];
        await memoryVectorStore.deleteMemories(ids);

        expect(mockStore.initialize).toHaveBeenCalledOnce();
        expect(mockStore.delete).toHaveBeenCalledWith(ids);
      });
    });

    describe('getMemoryCount', () => {
      it('should get memory count', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.count.mockResolvedValue(42);

        const count = await memoryVectorStore.getMemoryCount('tenant-1');

        expect(mockStore.initialize).toHaveBeenCalledOnce();
        expect(mockStore.count).toHaveBeenCalledWith('tenant-1');
        expect(count).toBe(42);
      });
    });

    describe('healthCheck', () => {
      it('should return false if not initialized', async () => {
        const result = await memoryVectorStore.healthCheck();
        expect(result).toBe(false);
      });

      it('should return health check result when initialized', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.healthCheck.mockResolvedValue(true);

        await memoryVectorStore.initialize();
        const result = await memoryVectorStore.healthCheck();

        expect(result).toBe(true);
        expect(mockStore.healthCheck).toHaveBeenCalledOnce();
      });
    });

    describe('close', () => {
      it('should close the store if close method exists', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.close.mockResolvedValue(undefined);

        await memoryVectorStore.initialize();
        await memoryVectorStore.close();

        expect(mockStore.close).toHaveBeenCalledOnce();
      });

      it('should handle stores without close method', async () => {
        const storeWithoutClose = { ...mockStore };
        delete storeWithoutClose.close;

        const memoryStore = new MemoryVectorStore(storeWithoutClose);
        await memoryStore.initialize();

        // Should not throw
        await expect(memoryStore.close()).resolves.toBeUndefined();
      });

      it('should reset initialization state', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        await memoryVectorStore.initialize();
        await memoryVectorStore.close();

        // Should be uninitialized after close
        const healthResult = await memoryVectorStore.healthCheck();
        expect(healthResult).toBe(false);
      });
    });

    describe('getHealth', () => {
      it('should return healthy status', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.healthCheck.mockResolvedValue(true);

        await memoryVectorStore.initialize();
        const health = await memoryVectorStore.getHealth();

        expect(health).toEqual({ status: 'healthy' });
      });

      it('should return unhealthy status', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.healthCheck.mockResolvedValue(false);

        await memoryVectorStore.initialize();
        const health = await memoryVectorStore.getHealth();

        expect(health).toEqual({ status: 'unhealthy' });
      });

      it('should handle health check errors', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.healthCheck.mockRejectedValue(
          new Error('Health check failed')
        );

        await memoryVectorStore.initialize();
        const health = await memoryVectorStore.getHealth();

        expect(health).toEqual({
          status: 'unhealthy',
          error: 'Health check failed',
        });
      });

      it('should handle unknown error types', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.healthCheck.mockRejectedValue('Unknown error');

        await memoryVectorStore.initialize();
        const health = await memoryVectorStore.getHealth();

        expect(health).toEqual({
          status: 'unhealthy',
          error: 'Unknown error',
        });
      });
    });

    describe('generateRelevanceReason', () => {
      it('should generate highly relevant reason for score >= 0.9', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.search.mockResolvedValue([
          {
            id: 'test',
            score: 0.95,
            payload: {
              id: 'mem-1',
              type: 'fact',
              content: 'test',
              confidence: 0.9,
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z',
              last_accessed_at: '2024-01-01T00:00:00.000Z',
              accessCount: 1,
              importance: 0.8,
              tags: [],
              tenant_id: 'tenant-1',
            },
          },
        ]);

        const results = await memoryVectorStore.searchMemories([0.1], {
          query: 'machine learning',
          tenant_id: 'tenant-1',
          limit: 10,
          threshold: 0.7,
          include_context: false,
          time_decay: false,
        });

        expect(results[0].relevance_reason).toBe(
          'Highly relevant to "machine learning" with excellent semantic match'
        );
      });

      it('should generate strong relevance reason for score >= 0.8', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.search.mockResolvedValue([
          {
            id: 'test',
            score: 0.85,
            payload: {
              id: 'mem-1',
              type: 'fact',
              content: 'test',
              confidence: 0.9,
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z',
              last_accessed_at: '2024-01-01T00:00:00.000Z',
              accessCount: 1,
              importance: 0.8,
              tags: [],
              tenant_id: 'tenant-1',
            },
          },
        ]);

        const results = await memoryVectorStore.searchMemories([0.1], {
          query: 'data science',
          tenant_id: 'tenant-1',
          limit: 10,
          threshold: 0.7,
          include_context: false,
          time_decay: false,
        });

        expect(results[0].relevance_reason).toBe(
          'Strong relevance to "data science" with good semantic similarity'
        );
      });

      it('should generate moderate relevance reason for score >= 0.7', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.search.mockResolvedValue([
          {
            id: 'test',
            score: 0.75,
            payload: {
              id: 'mem-1',
              type: 'fact',
              content: 'test',
              confidence: 0.9,
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z',
              last_accessed_at: '2024-01-01T00:00:00.000Z',
              accessCount: 1,
              importance: 0.8,
              tags: [],
              tenant_id: 'tenant-1',
            },
          },
        ]);

        const results = await memoryVectorStore.searchMemories([0.1], {
          query: 'artificial intelligence',
          tenant_id: 'tenant-1',
          limit: 10,
          threshold: 0.7,
          include_context: false,
          time_decay: false,
        });

        expect(results[0].relevance_reason).toBe(
          'Moderately relevant to "artificial intelligence" with decent semantic overlap'
        );
      });

      it('should generate weak relevance reason for score < 0.7', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.search.mockResolvedValue([
          {
            id: 'test',
            score: 0.6,
            payload: {
              id: 'mem-1',
              type: 'fact',
              content: 'test',
              confidence: 0.9,
              created_at: '2024-01-01T00:00:00.000Z',
              updated_at: '2024-01-01T00:00:00.000Z',
              last_accessed_at: '2024-01-01T00:00:00.000Z',
              accessCount: 1,
              importance: 0.8,
              tags: [],
              tenant_id: 'tenant-1',
            },
          },
        ]);

        const results = await memoryVectorStore.searchMemories([0.1], {
          query: 'neural networks',
          tenant_id: 'tenant-1',
          limit: 10,
          threshold: 0.5,
          include_context: false,
          time_decay: false,
        });

        expect(results[0].relevance_reason).toBe(
          'Some relevance to "neural networks" but weaker semantic connection'
        );
      });
    });

    describe('ensureInitialized', () => {
      it('should auto-initialize when calling methods on uninitialized store', async () => {
        mockStore.initialize.mockResolvedValue(undefined);
        mockStore.count.mockResolvedValue(5);

        // Store should auto-initialize
        const count = await memoryVectorStore.getMemoryCount('tenant-1');

        expect(mockStore.initialize).toHaveBeenCalledOnce();
        expect(count).toBe(5);
      });
    });
  });
});
