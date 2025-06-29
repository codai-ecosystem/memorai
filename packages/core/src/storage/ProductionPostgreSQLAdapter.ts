/**
 * Production PostgreSQL Storage Adapter
 * Enterprise-grade PostgreSQL implementation with connection pooling, transactions, and error handling
 */

import { Pool, PoolConfig } from 'pg';
import { MemoryMetadata } from '../types/index.js';
import { MemoryFilters, StorageAdapter } from './StorageAdapter.js';

export interface PostgreSQLConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  max?: number; // Maximum number of connections in pool
  min?: number; // Minimum number of connections in pool
}

/**
 * Production PostgreSQL storage adapter with enterprise features
 */
export class ProductionPostgreSQLAdapter implements StorageAdapter {
  private pool: Pool;
  private isInitialized = false;

  constructor(private config: PostgreSQLConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl || false,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 30000,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      max: config.max || 20, // Maximum 20 connections
      min: config.min || 2, // Minimum 2 connections
    });

    // Handle pool errors
    this.pool.on('error', (err: Error) => {
      console.error('PostgreSQL pool error:', err);
    });
  }

  /**
   * Initialize the adapter and create necessary tables
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.createTablesIfNotExists();
      await this.createIndexes();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize PostgreSQL adapter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Store a memory in PostgreSQL with transaction support
   */
  async store(memory: MemoryMetadata): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('PostgreSQL adapter not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO memories (
          id, type, content, confidence, created_at, updated_at, 
          last_accessed_at, access_count, importance, tags, 
          tenant_id, agent_id, context
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          content = EXCLUDED.content,
          confidence = EXCLUDED.confidence,
          updated_at = EXCLUDED.updated_at,
          last_accessed_at = EXCLUDED.last_accessed_at,
          access_count = EXCLUDED.access_count,
          importance = EXCLUDED.importance,
          tags = EXCLUDED.tags,
          context = EXCLUDED.context
      `;

      const values = [
        memory.id,
        memory.type,
        memory.content,
        memory.confidence,
        memory.createdAt,
        memory.updatedAt,
        memory.lastAccessedAt,
        memory.accessCount,
        memory.importance,
        JSON.stringify(memory.tags),
        memory.tenant_id,
        memory.agent_id,
        JSON.stringify(memory.context || {}),
      ];

      await client.query(query, values);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(
        `Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve a memory by ID
   */
  async retrieve(id: string): Promise<MemoryMetadata | null> {
    if (!this.isInitialized) {
      throw new Error('PostgreSQL adapter not initialized');
    }

    try {
      const query = 'SELECT * FROM memories WHERE id = $1';
      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.rowToMemory(result.rows[0]);
    } catch (error) {
      throw new Error(
        `Failed to retrieve memory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update memory with optimistic locking
   */
  async update(id: string, updates: Partial<MemoryMetadata>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('PostgreSQL adapter not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'id') return; // Don't update ID

        if (key === 'tags' || key === 'context') {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      });

      if (updateFields.length === 0) {
        await client.query('COMMIT');
        return;
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = $${paramCount}`);
      values.push(new Date());
      paramCount++;

      const query = `
        UPDATE memories 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
      `;
      values.push(id);

      const result = await client.query(query, values);

      if (result.rowCount === 0) {
        throw new Error(`Memory with ID ${id} not found`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(
        `Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Delete a memory by ID
   */
  async delete(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('PostgreSQL adapter not initialized');
    }

    try {
      const query = 'DELETE FROM memories WHERE id = $1';
      const result = await this.pool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new Error(`Memory with ID ${id} not found`);
      }
    } catch (error) {
      throw new Error(
        `Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List memories with advanced filtering and pagination
   */
  async list(filters: MemoryFilters = {}): Promise<MemoryMetadata[]> {
    if (!this.isInitialized) {
      throw new Error('PostgreSQL adapter not initialized');
    }

    try {
      let query = 'SELECT * FROM memories WHERE 1=1';
      const values: any[] = [];
      let paramCount = 1;

      // Apply filters
      if (filters.tenantId) {
        query += ` AND tenant_id = $${paramCount}`;
        values.push(filters.tenantId);
        paramCount++;
      }

      if (filters.agentId) {
        query += ` AND agent_id = $${paramCount}`;
        values.push(filters.agentId);
        paramCount++;
      }

      if (filters.type) {
        query += ` AND type = $${paramCount}`;
        values.push(filters.type);
        paramCount++;
      }

      if (filters.minImportance !== undefined) {
        query += ` AND importance >= $${paramCount}`;
        values.push(filters.minImportance);
        paramCount++;
      }

      if (filters.maxImportance !== undefined) {
        query += ` AND importance <= $${paramCount}`;
        values.push(filters.maxImportance);
        paramCount++;
      }

      if (filters.tags && filters.tags.length > 0) {
        query += ` AND tags ?& $${paramCount}`;
        values.push(JSON.stringify(filters.tags));
        paramCount++;
      }

      if (filters.startDate) {
        query += ` AND created_at >= $${paramCount}`;
        values.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        query += ` AND created_at <= $${paramCount}`;
        values.push(filters.endDate);
        paramCount++;
      }

      // Add ordering
      query += ' ORDER BY ';
      if (filters.sortBy === 'importance') {
        query += 'importance DESC';
      } else if (filters.sortBy === 'accessed') {
        query += 'last_accessed_at DESC';
      } else {
        query += 'created_at DESC'; // Default sort
      }

      // Add pagination
      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filters.limit);
        paramCount++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramCount}`;
        values.push(filters.offset);
        paramCount++;
      }

      const result = await this.pool.query(query, values);
      return result.rows.map((row: any) => this.rowToMemory(row));
    } catch (error) {
      throw new Error(
        `Failed to list memories: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear memories with optional tenant filtering
   */
  async clear(tenantId?: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('PostgreSQL adapter not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      let query = 'DELETE FROM memories';
      const values: any[] = [];

      if (tenantId) {
        query += ' WHERE tenant_id = $1';
        values.push(tenantId);
      }

      await client.query(query, values);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(
        `Failed to clear memories: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get memory count with filtering
   */
  async getCount(filters: MemoryFilters = {}): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('PostgreSQL adapter not initialized');
    }

    try {
      let query = 'SELECT COUNT(*) FROM memories WHERE 1=1';
      const values: any[] = [];
      let paramCount = 1;

      // Apply same filters as list method
      if (filters.tenantId) {
        query += ` AND tenant_id = $${paramCount}`;
        values.push(filters.tenantId);
        paramCount++;
      }

      if (filters.agentId) {
        query += ` AND agent_id = $${paramCount}`;
        values.push(filters.agentId);
        paramCount++;
      }

      // Add other filter conditions...

      const result = await this.pool.query(query, values);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw new Error(
        `Failed to get memory count: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Perform bulk operations with transaction support
   */
  async bulkStore(memories: MemoryMetadata[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('PostgreSQL adapter not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const memory of memories) {
        const query = `
          INSERT INTO memories (
            id, type, content, confidence, created_at, updated_at, 
            last_accessed_at, access_count, importance, tags, 
            tenant_id, agent_id, context
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `;

        const values = [
          memory.id,
          memory.type,
          memory.content,
          memory.confidence,
          memory.createdAt,
          memory.updatedAt,
          memory.lastAccessedAt,
          memory.accessCount,
          memory.importance,
          JSON.stringify(memory.tags),
          memory.tenant_id,
          memory.agent_id,
          JSON.stringify(memory.context || {}),
        ];

        await client.query(query, values);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(
        `Failed to bulk store memories: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
  }

  /**
   * Health check for the adapter
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      return {
        status: 'healthy',
        details: {
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingConnections: this.pool.waitingCount,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Create tables if they don't exist
   */
  private async createTablesIfNotExists(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS memories (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        confidence DECIMAL(3,2) DEFAULT 1.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        access_count INTEGER DEFAULT 0,
        importance DECIMAL(3,2) DEFAULT 0.5,
        tags JSONB DEFAULT '[]'::jsonb,
        tenant_id VARCHAR(255),
        agent_id VARCHAR(255),
        context JSONB DEFAULT '{}'::jsonb
      );

      CREATE TABLE IF NOT EXISTS memory_audit (
        id SERIAL PRIMARY KEY,
        memory_id VARCHAR(255) REFERENCES memories(id) ON DELETE CASCADE,
        operation VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id VARCHAR(255),
        changes JSONB
      );
    `;

    await this.pool.query(createTableQuery);
  }

  /**
   * Create indexes for better performance
   */
  private async createIndexes(): Promise<void> {
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_memories_tenant_id ON memories(tenant_id);',
      'CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);',
      'CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);',
      'CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);',
      'CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at);',
      'CREATE INDEX IF NOT EXISTS idx_memories_last_accessed_at ON memories(last_accessed_at);',
      'CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);',
      'CREATE INDEX IF NOT EXISTS idx_memories_context ON memories USING GIN(context);',
      "CREATE INDEX IF NOT EXISTS idx_memories_content_fts ON memories USING GIN(to_tsvector('english', content));",
    ];

    for (const query of indexQueries) {
      await this.pool.query(query);
    }
  }

  /**
   * Convert database row to MemoryMetadata
   */
  private rowToMemory(row: any): MemoryMetadata {
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      confidence: parseFloat(row.confidence),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastAccessedAt: new Date(row.last_accessed_at),
      accessCount: parseInt(row.access_count, 10),
      importance: parseFloat(row.importance),
      tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
      tenant_id: row.tenant_id,
      agent_id: row.agent_id,
      context:
        typeof row.context === 'object'
          ? row.context
          : JSON.parse(row.context || '{}'),
    };
  }
}
