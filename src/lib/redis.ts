import Redis from 'ioredis';

// Production Redis connection for memorai service
const createRedisClient = (): Redis => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD;

  const client = new Redis(redisUrl, {
    password: redisPassword,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    maxLoadingTimeout: 5000,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4, // Use IPv4

    // Connection pool settings
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Retry configuration
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },

    // Event handlers
    onConnect: () => {
      console.log('Redis client connected successfully');
    },

    onReady: () => {
      console.log('Redis client ready for commands');
    },

    onError: (error: Error) => {
      console.error('Redis client error:', error);
    },

    onClose: () => {
      console.log('Redis client connection closed');
    },
  });

  return client;
};

// Global Redis client instance
let redisClient: Redis | null = null;

// Initialize Redis client
const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

// Production Redis interface
export const redis = {
  async get(key: string): Promise<string | null> {
    try {
      const client = getRedisClient();
      await client.connect();
      return await client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  },

  async set(
    key: string,
    value: string,
    options?: { EX?: number; PX?: number }
  ): Promise<string | null> {
    try {
      const client = getRedisClient();
      await client.connect();

      if (options?.EX) {
        return await client.setex(key, options.EX, value);
      } else if (options?.PX) {
        return await client.psetex(key, options.PX, value);
      } else {
        return await client.set(key, value);
      }
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return null;
    }
  },

  async del(key: string): Promise<number> {
    try {
      const client = getRedisClient();
      await client.connect();
      return await client.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return 0;
    }
  },

  async hget(key: string, field: string): Promise<string | null> {
    try {
      const client = getRedisClient();
      await client.connect();
      return await client.hget(key, field);
    } catch (error) {
      console.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  },

  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      const client = getRedisClient();
      await client.connect();
      return await client.hset(key, field, value);
    } catch (error) {
      console.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return 0;
    }
  },

  async ping(): Promise<string> {
    try {
      const client = getRedisClient();
      await client.connect();
      return await client.ping();
    } catch (error) {
      console.error('Redis PING error:', error);
      return 'ERROR';
    }
  },

  async flushall(): Promise<string> {
    try {
      const client = getRedisClient();
      await client.connect();
      return await client.flushall();
    } catch (error) {
      console.error('Redis FLUSHALL error:', error);
      return 'ERROR';
    }
  },

  async quit(): Promise<void> {
    try {
      if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log('Redis connection closed successfully');
      }
    } catch (error) {
      console.error('Redis QUIT error:', error);
    }
  },

  // Additional production methods
  async exists(key: string): Promise<number> {
    try {
      const client = getRedisClient();
      await client.connect();
      return await client.exists(key);
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return 0;
    }
  },

  async expire(key: string, seconds: number): Promise<number> {
    try {
      const client = getRedisClient();
      await client.connect();
      return await client.expire(key, seconds);
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return 0;
    }
  },

  async ttl(key: string): Promise<number> {
    try {
      const client = getRedisClient();
      await client.connect();
      return await client.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  },
};

export default redis;
