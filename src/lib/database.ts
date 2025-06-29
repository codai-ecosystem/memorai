import { Pool } from 'pg';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// Production database configuration
const createDatabasePool = (): Pool => {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'memorai',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(
      process.env.DB_CONNECTION_TIMEOUT || '2000'
    ),
  };

  const pool = new Pool(config);

  // Event handlers
  pool.on('connect', () => {
    console.log('Database client connected to PostgreSQL');
  });

  pool.on('error', (err: Error) => {
    console.error('Database pool error:', err);
  });

  pool.on('remove', () => {
    console.log('Database client removed from pool');
  });

  return pool;
};

// Global database pool instance
let dbPool: Pool | null = null;

// Initialize database pool
const getDatabasePool = (): Pool => {
  if (!dbPool) {
    dbPool = createDatabasePool();
  }
  return dbPool;
};

// Transaction interface
interface Transaction {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
  rollback: () => Promise<void>;
  commit: () => Promise<void>;
}

// Production database interface
export const db = {
  async query(sql: string, params?: any[]): Promise<{ rows: any[] }> {
    try {
      const pool = getDatabasePool();
      const client = await pool.connect();

      try {
        const result = await client.query(sql, params);
        return { rows: result.rows };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Database query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  },

  async close(): Promise<void> {
    try {
      if (dbPool) {
        await dbPool.end();
        dbPool = null;
        console.log('Database pool closed successfully');
      }
    } catch (error) {
      console.error('Database close error:', error);
    }
  },

  async destroy(): Promise<void> {
    try {
      if (dbPool) {
        await dbPool.end();
        dbPool = null;
        console.log('Database pool destroyed successfully');
      }
    } catch (error) {
      console.error('Database destroy error:', error);
    }
  },

  async transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    const pool = getDatabasePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const tx: Transaction = {
        query: async (text: string, params?: any[]) => {
          const result = await client.query(text, params);
          return { rows: result.rows };
        },

        rollback: async () => {
          await client.query('ROLLBACK');
        },

        commit: async () => {
          await client.query('COMMIT');
        },
      };

      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  migrate: {
    async latest(): Promise<string[]> {
      try {
        // Check if migrations table exists
        await db.query(`
          CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Basic memory tables migration
        await db.query(`
          CREATE TABLE IF NOT EXISTS memories (
            id VARCHAR(255) PRIMARY KEY,
            tenant_id VARCHAR(255) NOT NULL,
            agent_id VARCHAR(255),
            type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            embedding VECTOR(1536),
            confidence REAL DEFAULT 1.0,
            importance REAL DEFAULT 0.5,
            emotional_weight REAL,
            tags TEXT[],
            context JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            access_count INTEGER DEFAULT 0,
            ttl TIMESTAMP
          )
        `);

        // Add indexes for performance
        await db.query(`
          CREATE INDEX IF NOT EXISTS idx_memories_tenant_id ON memories(tenant_id);
          CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
          CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
          CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
          CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
        `);

        console.log('Database migrations completed successfully');
        return ['initial_schema', 'create_memories_table', 'create_indexes'];
      } catch (error) {
        console.error('Database migration error:', error);
        throw error;
      }
    },

    async rollback(): Promise<string[]> {
      try {
        await db.query('DROP TABLE IF EXISTS memories CASCADE');
        await db.query('DROP TABLE IF EXISTS migrations CASCADE');
        console.log('Database migration rollback completed');
        return ['rollback_complete'];
      } catch (error) {
        console.error('Database rollback error:', error);
        throw error;
      }
    },
  },

  seed: {
    async run(): Promise<string[]> {
      try {
        // Insert test data if not exists
        const existingCount = await db.query('SELECT COUNT(*) FROM memories');

        if (existingCount.rows[0].count === '0') {
          await db.query(`
            INSERT INTO memories (id, tenant_id, agent_id, type, content, importance)
            VALUES 
              ('test-1', 'default', 'test-agent', 'fact', 'Test memory for development', 0.8),
              ('test-2', 'default', 'test-agent', 'procedure', 'How to test the memory system', 0.9)
          `);
          console.log('Database seeds completed successfully');
          return ['test_memories_seeded'];
        }

        console.log('Database already seeded, skipping');
        return ['already_seeded'];
      } catch (error) {
        console.error('Database seed error:', error);
        throw error;
      }
    },
  },

  // Additional production methods
  async healthCheck(): Promise<boolean> {
    try {
      const result = await db.query('SELECT 1 as health');
      return result.rows.length > 0 && result.rows[0].health === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  },

  async getStats(): Promise<{ connections: number; version: string }> {
    try {
      const pool = getDatabasePool();
      const versionResult = await db.query('SELECT version()');

      return {
        connections: pool.totalCount,
        version: versionResult.rows[0].version,
      };
    } catch (error) {
      console.error('Database stats error:', error);
      return { connections: 0, version: 'unknown' };
    }
  },
};

export default db;
