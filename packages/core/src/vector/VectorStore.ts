import { QdrantClient } from '@qdrant/js-client-rest';

import type {
  MemoryMetadata,
  MemoryQuery,
  MemoryResult,
} from '../types/index.js';
import { VectorStoreError } from '../types/index.js';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export interface VectorStore {
  initialize(): Promise<void>;
  upsert(points: VectorPoint[]): Promise<void>;
  search(vector: number[], query: MemoryQuery): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
  count(tenantId: string): Promise<number>;
  healthCheck(): Promise<boolean>;
  close?(): Promise<void>;
}

export class QdrantVectorStore implements VectorStore {
  private client: QdrantClient;
  private collection: string;
  private dimension: number;
  constructor(
    url: string,
    collection: string,
    dimension: number,
    apiKey?: string
  ) {
    const clientConfig: { url: string; apiKey?: string } = { url };
    if (apiKey) {
      clientConfig.apiKey = apiKey;
    }

    this.client = new QdrantClient(clientConfig);
    this.collection = collection;
    this.dimension = dimension;
  }

  public async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c: { name: string }) => c.name === this.collection
      );

      if (!exists) {
        await this.client.createCollection(this.collection, {
          vectors: {
            size: this.dimension,
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
        });

        // Create indexes for filtering
        await this.client.createPayloadIndex(this.collection, {
          field_name: 'tenant_id',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(this.collection, {
          field_name: 'type',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(this.collection, {
          field_name: 'created_at',
          field_schema: 'datetime',
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new VectorStoreError(
          `Failed to initialize Qdrant collection: ${error.message}`
        );
      }
      throw new VectorStoreError('Unknown initialization error');
    }
  }

  public async upsert(points: VectorPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }

    try {
      const qdrantPoints = points.map(point => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload,
      }));

      await this.client.upsert(this.collection, {
        wait: true,
        points: qdrantPoints,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new VectorStoreError(
          `Failed to upsert points: ${error.message}`,
          {
            point_count: points.length,
          }
        );
      }
      throw new VectorStoreError('Unknown upsert error');
    }
  }

  public async search(
    vector: number[],
    query: MemoryQuery
  ): Promise<SearchResult[]> {
    try {
      const filter: Record<string, unknown> = {
        must: [
          {
            key: 'tenant_id',
            match: { value: query.tenant_id },
          },
        ],
      };

      // Add optional filters
      if (query.type) {
        (filter.must as Array<Record<string, unknown>>).push({
          key: 'type',
          match: { value: query.type },
        });
      }

      if (query.agent_id) {
        (filter.must as Array<Record<string, unknown>>).push({
          key: 'agent_id',
          match: { value: query.agent_id },
        });
      }

      const searchResult = await this.client.search(this.collection, {
        vector,
        filter,
        limit: query.limit,
        score_threshold: query.threshold,
        with_payload: true,
      }); // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return searchResult.map((point: any) => ({
        id: point.id as string,
        score: point.score,
        payload: point.payload ?? {},
      }));
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new VectorStoreError(`Search failed: ${error.message}`, {
          query: query.query.substring(0, 100),
          tenant_id: query.tenant_id,
        });
      }
      throw new VectorStoreError('Unknown search error');
    }
  }

  public async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    try {
      await this.client.delete(this.collection, {
        wait: true,
        points: ids,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new VectorStoreError(
          `Failed to delete points: ${error.message}`,
          {
            id_count: ids.length,
          }
        );
      }
      throw new VectorStoreError('Unknown delete error');
    }
  }

  public async count(tenantId: string): Promise<number> {
    try {
      const result = await this.client.count(this.collection, {
        filter: {
          must: [
            {
              key: 'tenant_id',
              match: { value: tenantId },
            },
          ],
        },
      });

      return result.count;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new VectorStoreError(`Failed to count points: ${error.message}`, {
          tenant_id: tenantId,
        });
      }
      throw new VectorStoreError('Unknown count error');
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const collections = await this.client.getCollections(); // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return collections.collections.some(
        (c: any) => c.name === this.collection
      );
    } catch {
      return false;
    }
  }
}

export class MemoryVectorStore {
  private store: VectorStore;
  private isInitialized = false;

  constructor(store: VectorStore) {
    this.store = store;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.store.initialize();
    this.isInitialized = true;
  }

  public async storeMemory(
    memory: MemoryMetadata,
    embedding: number[]
  ): Promise<void> {
    await this.ensureInitialized();

    const point: VectorPoint = {
      id: memory.id,
      vector: embedding,
      payload: {
        ...memory,
        created_at: memory.createdAt.toISOString(),
        updated_at: memory.updatedAt.toISOString(),
        last_accessed_at: memory.lastAccessedAt.toISOString(),
        ttl: memory.ttl?.toISOString(),
      },
    };

    await this.store.upsert([point]);
  }

  public async storeMemories(
    memories: MemoryMetadata[],
    embeddings: number[][]
  ): Promise<void> {
    await this.ensureInitialized();

    if (memories.length !== embeddings.length) {
      throw new VectorStoreError('Memories and embeddings count mismatch');
    }

    const points: VectorPoint[] = memories.map((memory, index) => ({
      id: memory.id,
      vector: embeddings[index]!,
      payload: {
        ...memory,
        created_at: memory.createdAt.toISOString(),
        updated_at: memory.updatedAt.toISOString(),
        last_accessed_at: memory.lastAccessedAt.toISOString(),
        ttl: memory.ttl?.toISOString(),
      },
    }));

    await this.store.upsert(points);
  }

  public async searchMemories(
    queryEmbedding: number[],
    query: MemoryQuery
  ): Promise<MemoryResult[]> {
    await this.ensureInitialized();

    const results = await this.store.search(queryEmbedding, query);

    return results.map(result => {
      const payload = result.payload;

      return {
        memory: {
          id: payload.id as string,
          type: payload.type as MemoryMetadata['type'],
          content: payload.content as string,
          confidence: payload.confidence as number,
          createdAt: new Date(payload.created_at as string),
          updatedAt: new Date(payload.updated_at as string),
          lastAccessedAt: new Date(payload.last_accessed_at as string),
          accessCount: payload.accessCount as number,
          importance: payload.importance as number,
          emotional_weight: payload.emotional_weight as number | undefined,
          tags: payload.tags as string[],
          context: payload.context as Record<string, unknown> | undefined,
          tenant_id: payload.tenant_id as string,
          agent_id: payload.agent_id as string | undefined,
          ttl: payload.ttl ? new Date(payload.ttl as string) : undefined,
        },
        score: result.score,
        relevance_reason: this.generateRelevanceReason(
          result.score,
          query.query
        ),
      };
    });
  }

  public async deleteMemories(ids: string[]): Promise<void> {
    await this.ensureInitialized();
    await this.store.delete(ids);
  }

  public async getMemoryCount(tenantId: string): Promise<number> {
    await this.ensureInitialized();
    return this.store.count(tenantId);
  }
  public async healthCheck(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    return this.store.healthCheck();
  }
  public async close(): Promise<void> {
    if (this.store.close) {
      await this.store.close();
    }
    this.isInitialized = false;
  }

  public async getHealth(): Promise<{ status: string; error?: string }> {
    try {
      const isHealthy = await this.healthCheck();
      return { status: isHealthy ? 'healthy' : 'unhealthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private generateRelevanceReason(score: number, query: string): string {
    if (score >= 0.9) {
      return `Highly relevant to "${query}" with excellent semantic match`;
    } else if (score >= 0.8) {
      return `Strong relevance to "${query}" with good semantic similarity`;
    } else if (score >= 0.7) {
      return `Moderately relevant to "${query}" with decent semantic overlap`;
    } else {
      return `Some relevance to "${query}" but weaker semantic connection`;
    }
  }
}

/**
 * Simple in-memory vector store for BASIC tier - no external dependencies
 */
export class InMemoryVectorStore implements VectorStore {
  private vectors: Map<string, VectorPoint> = new Map();

  public async initialize(): Promise<void> {
    // No initialization needed for in-memory store
    return Promise.resolve();
  }

  public async upsert(points: VectorPoint[]): Promise<void> {
    for (const point of points) {
      this.vectors.set(point.id, point);
    }
  }

  public async search(
    vector: number[],
    query: MemoryQuery
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const [id, point] of this.vectors.entries()) {
      // Simple cosine similarity calculation
      const score = this.cosineSimilarity(vector, point.vector);

      // Apply tenant filtering if specified
      if (query.tenant_id && point.payload.tenant_id !== query.tenant_id) {
        continue;
      }

      // Apply type filtering if specified
      if (query.type && point.payload.type !== query.type) {
        continue;
      }

      results.push({
        id,
        score,
        payload: point.payload,
      });
    }

    // Sort by score (highest first) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit || 10);
  }

  public async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.vectors.delete(id);
    }
  }

  public async count(tenantId: string): Promise<number> {
    let count = 0;
    for (const point of this.vectors.values()) {
      if (!tenantId || point.payload.tenant_id === tenantId) {
        count++;
      }
    }
    return count;
  }

  public async healthCheck(): Promise<boolean> {
    return true; // In-memory store is always healthy
  }

  public async close(): Promise<void> {
    this.vectors.clear();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
